import { Router } from "express";
import {
  getIntegrations,
  connectIntegration,
  removeIntegration,
  slackOAuthStart,
  slackOAuthCallback,
  jiraOAuthStart,
  jiraOAuthCallback,
  syncGmailController,
} from "../controllers/integrations.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// List connected integrations (no tokens in response)
router.get("/", requireAuth, asyncHandler(getIntegrations));

// Live Gmail Sync / Test Simulation
router.post("/gmail/sync", requireAuth, asyncHandler(syncGmailController));
router.get("/gmail/sync", requireAuth, asyncHandler(syncGmailController));
router.post("/gmail/simulate", requireAuth, asyncHandler(syncGmailController));
router.get("/gmail/simulate", requireAuth, asyncHandler(syncGmailController));

// Connect an integration (mock in dev mode)
router.post("/:provider/connect", requireAuth, asyncHandler(connectIntegration));
router.get("/:provider/connect", requireAuth, asyncHandler(connectIntegration));

// Disconnect an integration
router.delete("/:provider", requireAuth, asyncHandler(removeIntegration));

// OAuth start/callback routes
router.get("/slack/oauth/start", requireAuth, asyncHandler(slackOAuthStart));
router.get("/slack/oauth/callback", asyncHandler(slackOAuthCallback));
router.get("/jira/oauth/start", requireAuth, asyncHandler(jiraOAuthStart));
router.get("/jira/oauth/callback", asyncHandler(jiraOAuthCallback));

export default router;
