import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.routes.js";
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Health Check
// Health check endpoint
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