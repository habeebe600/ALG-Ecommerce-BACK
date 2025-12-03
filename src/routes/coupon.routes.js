import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  createCoupon,
  validateCoupon
} from "../controllers/coupon.controller.js";

const router = express.Router();

router.post("/", authMiddleware, isAdmin, createCoupon);
router.post("/validate", authMiddleware, validateCoupon);

export default router;
