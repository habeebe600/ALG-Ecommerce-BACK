import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { createReplacement } from "../controllers/return&replacement.controller.js"
import {
  requestReturn,
  getMyReturns,
  getAllReturns,
  updateReturnStatus
} from "../controllers/return&replacement.controller.js";

const router = express.Router();

// USER
router.post("/", authMiddleware, requestReturn);
router.get("/my", authMiddleware, getMyReturns);

// ADMIN
router.get("/all", authMiddleware, isAdmin, getAllReturns);
router.put("/:id/status", authMiddleware, isAdmin, updateReturnStatus);
/* --Replacement--*/
router.post("/:returnId/replacement", authMiddleware, isAdmin, createReplacement);

export default router;
