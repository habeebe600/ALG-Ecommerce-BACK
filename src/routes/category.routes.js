import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";

import {
  createCategory,
  listCategories
} from "../controllers/category.controller.js";

const router = express.Router();

/* ADMIN */
router.post("/", authMiddleware, isAdmin, createCategory);

/* CUSTOMER */
router.get("/", listCategories);

export default router;
