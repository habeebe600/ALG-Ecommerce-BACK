import express from "express";
import cors from "cors";
import http from "http";
import { PrismaClient } from "@prisma/client";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";

// Routes
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import addressRoutes from "./routes/address.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import returnRoutes from "./routes/return&replacement.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import orderTrackingRoutes from "./routes/orderTracking.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();
const prisma = new PrismaClient();

/* =========================
   ✅ MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* =========================
   ✅ ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/order-tracking", orderTrackingRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/admin", adminRoutes);

/* =========================
   ✅ HEALTH CHECK
========================= */
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

/* =========================
   ✅ SOCKET.IO + JWT SETUP
========================= */

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
export const io = new IOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

// ✅ SOCKET JWT AUTH MIDDLEWARE
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user data to socket
    socket.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (err) {
    return next(new Error("Authentication failed"));
  }
});

// ✅ SOCKET CONNECTION HANDLER
io.on("connection", (socket) => {
  const userId = socket.user?.userId;

  console.log("🔌 Socket connected:", socket.id, "User:", userId);

  // ✅ Join user-specific room
  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`👤 User joined room: user_${userId}`);
  }

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* =========================
   ✅ SERVER START
========================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Alg E-commerce API running on http://localhost:${PORT}`);
});

export default app;
