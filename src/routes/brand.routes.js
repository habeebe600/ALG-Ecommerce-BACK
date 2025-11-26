import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";

import {
  createBrand,
  getAllBrands,
  deleteBrand
} from "../controllers/brand.controller.js";

const router = express.Router();

/* ADMIN */
router.post("/", authMiddleware, isAdmin, createBrand);
router.delete("/:id", authMiddleware, isAdmin, deleteBrand);

/* CUSTOMER */
router.get("/", getAllBrands);

export default router;
