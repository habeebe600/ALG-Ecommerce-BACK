import jwt from "jsonwebtoken";
import { isBlacklisted } from "../utils/tokenBlacklist.js";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No authorization header" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  if (isBlacklisted(token)) return res.status(401).json({ message: "Logged out token" });

  try {
 const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = { userId: payload.userId, role: payload.role };
  next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
