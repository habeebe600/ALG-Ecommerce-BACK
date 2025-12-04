// src/routes/inventory.routes.js
import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  getLowStockProducts,
  adminAdjustStock,
  adminSetThreshold,
  getInventory
} from "../controllers/inventory.controller.js";

const router = express.Router();

// Admin-only inventory management
router.get("/low-stock", authMiddleware, isAdmin, getLowStockProducts);
router.get("/:productId", authMiddleware, isAdmin, getInventory);
router.put("/:productId/adjust", authMiddleware, isAdmin, adminAdjustStock);
router.put("/:productId/threshold", authMiddleware, isAdmin, adminSetThreshold);

export default router;
