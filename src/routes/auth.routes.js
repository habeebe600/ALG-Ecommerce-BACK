import express from "express";
import {
  register,
  verifyAccount,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  deleteUserByEmail
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/verify", verifyAccount);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes (require valid JWT)
router.post("/change-password", authMiddleware, changePassword);
router.post("/logout", authMiddleware, logout);

// Admin only (or expose carefully)
router.delete("/deleteUser", deleteUserByEmail);

export default router;
