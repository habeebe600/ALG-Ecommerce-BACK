import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

// Routes
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import addressRoutes from "./routes/address.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);

// Health Check
app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "Alg E-commerce API running 🚀",
      database: "Connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "Alg E-commerce API running",
      database: "Disconnected",
      error: error.message
    });
  }
});

export default app;
