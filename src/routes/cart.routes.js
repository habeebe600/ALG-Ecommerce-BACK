import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart
} from "../controllers/cart.controller.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart); // or allow guest by omitting auth
router.get("/", authMiddleware, getCart);
router.put("/item/:itemId", authMiddleware, updateCartItem);
router.delete("/item/:itemId", authMiddleware, removeCartItem);
router.delete("/clear", authMiddleware, clearCart);

export default router;
