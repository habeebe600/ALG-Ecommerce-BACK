// src/controllers/inventory.controller.js
import prisma from "../../prisma/prismaClient.js";
import {
  getLowStockInventories,
  adjustStock,
  setLowStockThreshold,
} from "../services/inventory.service.js";

/** GET /api/inventory/low-stock  (admin) */
export const getLowStockProducts = async (req, res) => {
  try {
    const list = await getLowStockInventories();
    return res.json({ data: list });
  } catch (err) {
    console.error("GET LOW STOCK ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** PUT /api/inventory/:productId/adjust (admin) */
export const adminAdjustStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { op, value } = req.body; // op: set|increment|decrement

    if (!["set", "increment", "decrement"].includes(op)) {
      return res.status(400).json({ message: "Invalid op" });
    }

    const updated = await adjustStock(productId, { op, value });
    return res.json({ message: "Stock updated", inventory: updated });
  } catch (err) {
    console.error("ADMIN ADJUST STOCK ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** PUT /api/inventory/:productId/threshold (admin) */
export const adminSetThreshold = async (req, res) => {
  try {
    const { productId } = req.params;
    const { threshold } = req.body;
    if (threshold == null) return res.status(400).json({ message: "threshold required" });

    const updated = await setLowStockThreshold(productId, Number(threshold));
    return res.json({ message: "Threshold updated", inventory: updated });
  } catch (err) {
    console.error("SET THRESHOLD ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/inventory/:productId (admin) - view inventory record */
export const getInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const inv = await prisma.inventory.findUnique({
      where: { productId },
      include: { product: true },
    });
    if (!inv) return res.status(404).json({ message: "Inventory not found" });
    return res.json({ inventory: inv });
  } catch (err) {
    console.error("GET INVENTORY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
