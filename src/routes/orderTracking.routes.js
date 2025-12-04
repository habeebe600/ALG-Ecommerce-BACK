import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getOrderTracking } from "../controllers/orderTracking.controller.js";

const router = express.Router();

router.get("/:orderId", authMiddleware, getOrderTracking);

export default router;
