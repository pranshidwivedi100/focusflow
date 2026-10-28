import { Router } from "express";
import {
  registerLocalUser,
  loginLocalUser,
  forgotPassword,
  resetPassword,
  mockLogin,
} from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.post("/register", asyncHandler(registerLocalUser));
router.post("/login", asyncHandler(loginLocalUser));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));
router.post("/mock-login", asyncHandler(mockLogin));
router.get("/mock-login", asyncHandler(mockLogin));

export default router;
