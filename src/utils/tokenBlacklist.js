// utils/tokenBlacklist.js

// In-memory blacklist for tokens (ideal: use Redis for production)
const tokenBlacklist = new Set();

export const addToBlacklist = (token) => {
  tokenBlacklist.add(token);
};

export const isBlacklisted = (token) => tokenBlacklist.has(token);
