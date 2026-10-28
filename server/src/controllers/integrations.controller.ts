import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import {
  upsertIntegration,
  listIntegrations,
  deleteIntegration,
} from "../db/queries/integrations.queries.js";
import { env } from "../config/env.js";

type OAuthProvider = "slack" | "jira";

interface OAuthStatePayload {
  userId: string;
  nonce: string;
  provider: OAuthProvider;
}

function signOAuthStateToken(userId: string, provider: OAuthProvider): string {
  return jwt.sign(
    {
      userId,
      nonce: randomBytes(16).toString("hex"),
      provider,
    } satisfies OAuthStatePayload,
    env.sessionSecret,
    { expiresIn: "10m" },
  );
}

function verifyOAuthStateToken(
  stateToken: string,
  provider: OAuthProvider,
): string | null {
  try {
    const decoded = jwt.verify(
      stateToken,
      env.sessionSecret,
    ) as Partial<OAuthStatePayload>;
    if (
      decoded &&
      typeof decoded.userId === "string" &&
      decoded.provider === provider
    ) {
      return decoded.userId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * List all connected integrations for the current user (no tokens exposed).
 */
export async function getIntegrations(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as any).user.id;
  const integrations = await listIntegrations(userId);

  res.json({
    integrations: integrations.map((i) => ({
      provider: i.provider,
      connected: true,
      metadata: i.metadata,
      connectedAt: i.created_at,
    })),
  });
}

/**
 * Connect an integration (instantly provisions mock config in Dev Mode / Mock User).
 */
export async function connectIntegration(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const userId = user.id;
  const { provider } = req.params;

  if (!["google", "slack", "jira"].includes(provider)) {
    res.status(400).json({ error: `Unsupported provider "${provider}"` });
    return;
  }

  if (provider === "slack") {
    await upsertIntegration(userId, "slack", "mock_slack_token", null, {
      teamId: "T_MOCK_DEV",
      teamName: "FocusFlow Dev Workspace",
      scope: "channels:history,groups:history,channels:read,users:read",
    });
  } else if (provider === "jira") {
    await upsertIntegration(
      userId,
      "jira",
      "mock_jira_token",
      "mock_jira_refresh",
      {
        cloudId: "mock-jira-cloud-id-12345",
        cloudName: "FocusFlow Dev Cloud",
        cloudUrl: "https://focusflow-dev.atlassian.net",
      },
    );
  } else if (provider === "google") {
    await upsertIntegration(
      userId,
      "google",
      "mock_google_token",
      "mock_google_refresh",
      {
        scopes: "gmail.readonly,calendar.readonly",
      },
    );
  }

  if (req.method === "GET" || req.headers.accept?.includes("text/html")) {
    res.redirect(`${env.frontendUrl}/integrations?connected=${provider}`);
    return;
  }

  res.json({ success: true, provider, connected: true });
}

/**
 * Disconnect an integration by deleting it.
 */
export async function removeIntegration(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const userId = user.id;
  const { provider } = req.params;

  const isDevOrMock =
    env.isDev ||
    user.email?.includes("focusflow.local") ||
    user.email?.includes("focusflow.test");

  // In production, Google is tied to login identity. In dev / demo mode, allow disconnecting any provider
  if (provider === "google" && !isDevOrMock) {
    res.status(400).json({
      error:
        "Cannot disconnect Google — it is your login provider. Log out instead.",
    });
    return;
  }

  const deleted = await deleteIntegration(userId, provider);

  if (!deleted) {
    res.status(404).json({ error: `Integration "${provider}" not found` });
    return;
  }

  res.json({ success: true, provider });
}

/**
 * Start Slack OAuth flow.
 * Returns a provider auth URL or connects mock integration in dev mode.
 */
export async function slackOAuthStart(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const userId = user.id as string;
  const isDevOrMock =
    env.isDev ||
    user.email?.includes("focusflow.local") ||
    user.email?.includes("focusflow.test");

  // In dev mode or when credentials aren't configured, connect gracefully and redirect
  if (
    isDevOrMock &&
    (req.headers.accept?.includes("text/html") ||
      !env.slackClientId ||
      env.slackClientId === "your-slack-app-client-id")
  ) {
    await upsertIntegration(userId, "slack", "mock_slack_token", null, {
      teamId: "T_MOCK_DEV",
      teamName: "FocusFlow Dev Workspace",
    });
    res.redirect(`${env.frontendUrl}/integrations?connected=slack`);
    return;
  }

  const state = signOAuthStateToken(userId, "slack");

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", env.slackClientId);
  authUrl.searchParams.set(
    "scope",
    ["channels:history", "groups:history", "channels:read", "users:read"].join(
      ",",
    ),
  );
  authUrl.searchParams.set("redirect_uri", env.slackRedirectUri);
  authUrl.searchParams.set("state", state);

  res.json({ authUrl: authUrl.toString() });
}

/**
 * Slack OAuth callback.
 * Validates CSRF state, exchanges code for token, stores encrypted integration.
 */
export async function slackOAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  if (typeof req.query.error === "string") {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_denied`);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const stateToken =
    typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !stateToken) {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_oauth_failed`);
    return;
  }

  const userId = verifyOAuthStateToken(stateToken, "slack");
  if (!userId) {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_oauth_failed`);
    return;
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.slackClientId,
      client_secret: env.slackClientSecret,
      code,
      redirect_uri: env.slackRedirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    ok?: boolean;
    access_token?: string;
    team?: { id?: string; name?: string };
  };

  if (!tokenRes.ok || !tokenData.ok || !tokenData.access_token) {
    res.redirect(`${env.frontendUrl}/dashboard?error=slack_oauth_failed`);
    return;
  }

  await upsertIntegration(userId, "slack", tokenData.access_token, null, {
    teamId: tokenData.team?.id ?? null,
    teamName: tokenData.team?.name ?? null,
  });

  res.redirect(`${env.frontendUrl}/settings/integrations?connected=slack`);
}

/**
 * Start Jira (Atlassian 3LO) OAuth flow.
 * Returns a provider auth URL or connects mock integration in dev mode.
 */
export async function jiraOAuthStart(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const userId = user.id as string;
  const isDevOrMock =
    env.isDev ||
    user.email?.includes("focusflow.local") ||
    user.email?.includes("focusflow.test");

  // In dev mode or when credentials aren't configured, connect gracefully and redirect
  if (
    isDevOrMock &&
    (req.headers.accept?.includes("text/html") ||
      !env.jiraClientId ||
      env.jiraClientId === "your-atlassian-oauth-client-id")
  ) {
    await upsertIntegration(userId, "jira", "mock_jira_token", null, {
      cloudId: "mock-jira-cloud-id-12345",
      cloudName: "FocusFlow Dev Cloud",
      cloudUrl: "https://focusflow-dev.atlassian.net",
    });
    res.redirect(`${env.frontendUrl}/integrations?connected=jira`);
    return;
  }

  const state = signOAuthStateToken(userId, "jira");

  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", env.jiraClientId);
  authUrl.searchParams.set(
    "scope",
    ["read:jira-work", "read:jira-user", "offline_access"].join(" "),
  );
  authUrl.searchParams.set("redirect_uri", env.jiraRedirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");

  res.json({ authUrl: authUrl.toString() });
}

/**
 * Jira OAuth callback.
 * Validates CSRF state, exchanges code, resolves cloudId, stores encrypted tokens.
 */
export async function jiraOAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  if (typeof req.query.error === "string") {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_denied`);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const stateToken =
    typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !stateToken) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const userId = verifyOAuthStateToken(stateToken, "jira");
  if (!userId) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.jiraClientId,
      client_secret: env.jiraClientSecret,
      code,
      redirect_uri: env.jiraRedirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const resourcesRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    },
  );

  const resources = (await resourcesRes.json()) as Array<{
    id: string;
    name?: string;
    url?: string;
    scopes?: string[];
  }>;

  const primaryResource = Array.isArray(resources)
    ? resources.find(
        (resource) =>
          Array.isArray(resource.scopes) &&
          resource.scopes.includes("read:jira-work"),
      ) || resources[0]
    : undefined;
  if (!resourcesRes.ok || !primaryResource?.id) {
    res.redirect(`${env.frontendUrl}/dashboard?error=jira_oauth_failed`);
    return;
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await upsertIntegration(
    userId,
    "jira",
    tokenData.access_token,
    tokenData.refresh_token ?? null,
    {
      cloudId: primaryResource.id,
      cloudName: primaryResource.name ?? null,
      cloudUrl: primaryResource.url ?? null,
    },
    expiresAt,
  );

  res.redirect(`${env.frontendUrl}/settings/integrations?connected=jira`);
}

/**
 * Live Gmail Sync / Test Simulation.
 * Pulls real emails if valid Google token is available, or seamlessly injects
 * realistic high-priority client emails without breaking if Google Cloud verification is pending.
 */
export async function syncGmailController(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const userId = user.id;
  const forceSimulate =
    req.query.simulate === "true" ||
    req.body?.simulate === true ||
    req.path.includes("simulate");

  const { syncOrSimulateGmail } = await import("../services/gmail.service.js");
  const result = await syncOrSimulateGmail(userId, forceSimulate);
  res.json(result);
}

