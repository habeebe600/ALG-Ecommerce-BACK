import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { validateProduct } from "../utils/validators/product.validator.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  getSingleProduct,
  uploadProductImages,
  updateStock
} from "../controllers/product.controller.js";

const router = express.Router();

/* ADMIN */
router.post("/", authMiddleware, isAdmin, validateProduct, createProduct);
router.put("/:id", authMiddleware, isAdmin, updateProduct);
router.delete("/:id", authMiddleware, isAdmin, deleteProduct);
router.post("/:id/images", authMiddleware, isAdmin, uploadProductImages);
router.put("/:id/stock", authMiddleware, isAdmin, updateStock);

/* CUSTOMER */
router.get("/", listProducts);
router.get("/:slug", getSingleProduct);

export default router;
