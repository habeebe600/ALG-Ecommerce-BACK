import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  addReview,
  getProductReviews,
  deleteReview
} from "../controllers/review.controller.js";

const router = express.Router();

// USER
router.post("/", authMiddleware, addReview);

// PUBLIC
router.get("/:productId", getProductReviews);

// ADMIN
router.delete("/:id", authMiddleware, isAdmin, deleteReview);

export default router;
