import express from "express";
import { isAdmin } from "../middleware/isAdmin.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

import { getDashboardStats } from "../controllers/admin/dashboard.controller.js";
import { getSalesAnalytics } from "../controllers/admin/sales.controller.js";
import { getTopProducts } from "../controllers/admin/sales.controller.js";
import { getAllUsers, blockUser } from "../controllers/admin/user.controller.js";
import { getAllProductsAdmin, deleteProduct } from "../controllers/admin/product.controller.js";
import { getAllOrdersAdmin } from "../controllers/admin/order.controller.js";
import { getLowStockProducts } from "../controllers/admin/order.controller.js";

const router = express.Router();

router.use(authMiddleware, isAdmin);

// DASHBOARD
router.get("/dashboard", getDashboardStats);

// SALES
router.get("/sales", getSalesAnalytics);
router.get("/top-products", getTopProducts);

// USERS
router.get("/users", getAllUsers);
router.patch("/users/block/:id", blockUser);

// PRODUCTS
router.get("/products", getAllProductsAdmin);
router.delete("/products/:id", deleteProduct);

// ORDERS
router.get("/orders", getAllOrdersAdmin);

// INVENTORY
router.get("/inventory/low-stock", getLowStockProducts);

export default router;
