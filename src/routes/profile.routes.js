import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { upsertProfile, getProfile } from "../controllers/profile.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.post("/", authMiddleware, upsertProfile);

export default router;
