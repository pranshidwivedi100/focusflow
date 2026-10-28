import type { Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  GOOGLE_AUTH_SCOPES,
  upsertUserAndGoogleIntegration,
  createUserSession,
} from "../services/auth.service.js";
import {
  listIntegrations,
  upsertIntegration,
} from "../db/queries/integrations.queries.js";
import {
  createLocalUser,
  findUserByEmail,
  updatePasswordHash,
  upsertUser,
} from "../db/queries/users.queries.js";
import { listTasks } from "../db/queries/tasks.queries.js";
import { pool } from "../config/database.js";
import {
  createPasswordReset,
  findActivePasswordReset,
  markPasswordResetUsed,
} from "../db/queries/password-resets.queries.js";
import { env } from "../config/env.js";
import type { DbUser } from "../types/index.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function formatUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.display_name,
    secondaryEmails: user.secondary_emails ?? [],
    linkedAccounts: user.linked_accounts ?? {},
    avatarUrl: user.avatar_url,
  };
}

/**
 * Initiates the Google OAuth flow by redirecting to Google's consent screen.
 */
export async function googleAuthRedirect(
  _req: Request,
  res: Response,
): Promise<void> {
  const url = getGoogleAuthUrl({ scopes: GOOGLE_AUTH_SCOPES });
  res.redirect(url);
}

/**
 * Handles the OAuth callback from Google.
 * 1. Exchanges auth code for tokens
 * 2. Extracts user profile from id_token
 * 3. Upserts user in DB
 * 4. Stores encrypted Google tokens as an integration
 * 5. Creates a session
 * 6. Redirects to the frontend dashboard
 */
export async function googleAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const code = req.query.code as string;

  if (!code) {
    res.redirect(`${env.frontendUrl}?error=no_code`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await upsertUserAndGoogleIntegration(tokens);
    await createUserSession(req, user);
    res.redirect(`${env.frontendUrl}/dashboard`);
  } catch (err) {
    console.error("[Auth] Google callback error:", err);
    res.redirect(`${env.frontendUrl}?error=auth_failed`);
  }
}

/**
 * Returns the current user's profile and connected integrations.
 * Used by the frontend to check auth state on page load.
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const integrations = await listIntegrations(user.id);

  res.json({
    user: formatUser(user),
    integrations: integrations.map((i) => ({
      provider: i.provider,
      connected: true,
      connectedAt: i.created_at,
    })),
  });
}

/**
 * Local email/password registration.
 */
export async function registerLocalUser(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const safeDisplayName = displayName?.trim() || normalizedEmail.split("@")[0];
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createLocalUser(
    normalizedEmail,
    safeDisplayName,
    safeDisplayName,
    passwordHash,
  );

  await createUserSession(req, user);
  res.json({ message: "Success", user: formatUser(user) });
}

/**
 * Local email/password login.
 */
export async function loginLocalUser(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user || !user.password_hash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await createUserSession(req, user);
  res.json({ message: "Success", user: formatUser(user) });
}

/**
 * Generate a password reset token (1 hour expiry).
 */
export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    res.json({ message: "If the account exists, a reset link was created." });
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await createPasswordReset(user.id, tokenHash, expiresAt);

  res.json({
    message: "Reset token created",
    resetToken: rawToken,
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Reset password using a valid reset token.
 */
export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { token, password } = req.body as {
    token?: string;
    password?: string;
  };

  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const resetRecord = await findActivePasswordReset(tokenHash);

  if (!resetRecord) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const newHash = await bcrypt.hash(password, 12);
  await updatePasswordHash(resetRecord.user_id, newHash);
  await markPasswordResetUsed(resetRecord.id);

  res.json({ message: "Password updated" });
}

/**
 * Destroys the session and clears the cookie.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      console.error("[Auth] Logout error:", err);
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    // Clear the session cookie with the same options used in session.ts
    // so the browser reliably removes it across all deployment environments
    res.clearCookie("focusflow.sid", {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      path: "/",
    });
    res.json({ success: true });
  });
}

/**
 * Developer / Mock login bypass for testing without Google OAuth credentials.
 */
export async function mockLogin(
  req: Request,
  res: Response,
): Promise<void> {
  const email = "dev@focusflow.local";
  const name = "Demo Developer";
  const avatarUrl =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80";

  try {
    const user = await upsertUser(email, name, avatarUrl);

    // Ensure default Google integration is active for demo user
    await upsertIntegration(
      user.id,
      "google",
      "mock_google_token",
      "mock_google_refresh",
      {
        scopes: "gmail.readonly,calendar.readonly",
      },
    );

    // Seed realistic demo tasks if user has no tasks yet
    const existingTasks = await listTasks(user.id);
    if (existingTasks.length === 0) {
      const demoTasks = [
        {
          title: "Review and approve Q4 engineering roadmap proposal",
          urgency: 0.95,
          importance: 0.9,
          dueOffsetHours: 1,
        },
        {
          title: "Address high-priority security audit findings on session encryption",
          urgency: 0.85,
          importance: 0.92,
          dueOffsetHours: 4,
        },
        {
          title: "Unblock enterprise customer SSO deployment on Slack & Jira",
          urgency: 0.75,
          importance: 0.85,
          dueOffsetHours: 8,
        },
        {
          title: "Sync with product design team on kinetic dashboard animations",
          urgency: 0.45,
          importance: 0.7,
          dueOffsetHours: 24,
        },
        {
          title: "Clean up routine dependency deprecation warnings",
          urgency: 0.25,
          importance: 0.4,
          dueOffsetHours: 48,
        },
      ];

      for (const t of demoTasks) {
        const dueAt = new Date(Date.now() + t.dueOffsetHours * 60 * 60 * 1000);
        await pool.query(
          `INSERT INTO tasks (user_id, title, status, urgency_score, importance_score, due_at)
           VALUES ($1, $2, 'pending', $3, $4, $5)`,
          [user.id, t.title, t.urgency, t.importance, dueAt],
        );
      }
    }

    await createUserSession(req, user);

    if (req.method === "GET" || req.headers.accept?.includes("text/html")) {
      res.redirect(`${env.frontendUrl}/dashboard`);
      return;
    }

    res.json({
      message: "Logged in as demo developer",
      user: formatUser(user),
    });
  } catch (err) {
    console.error("[Auth] Mock login error:", err);
    res.status(500).json({ error: "Failed to create mock session" });
  }
}
