import { Router } from "express";
import {
  getNotifications,
  markNotificationsRead,
} from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(getNotifications));
router.post("/mark-read", requireAuth, asyncHandler(markNotificationsRead));

export default router;
