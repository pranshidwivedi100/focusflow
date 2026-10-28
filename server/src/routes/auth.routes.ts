import { Router } from "express";
import {
  googleAuthRedirect,
  googleAuthCallback,
  getCurrentUser,
  logout,
  mockLogin,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// Development/Mock login bypass for local testing
router.get("/mock", asyncHandler(mockLogin));
router.post("/mock", asyncHandler(mockLogin));

// Initiate Google OAuth — redirects to Google's consent screen
router.get("/google", asyncHandler(googleAuthRedirect));

// Google redirects here after user grants consent
router.get("/google/callback", asyncHandler(googleAuthCallback));

// Proxy endpoints used by frontend connect buttons
router.get("/slack", requireAuth, (_req, res) => {
  res.redirect("/api/integrations/slack/oauth/start");
});

router.get("/jira", requireAuth, (_req, res) => {
  res.redirect("/api/integrations/jira/oauth/start");
});

// Get current authenticated user's profile + connected integrations
router.get("/me", requireAuth, asyncHandler(getCurrentUser));

// Destroy session and clear cookie
router.post("/logout", requireAuth, asyncHandler(logout));

export default router;
