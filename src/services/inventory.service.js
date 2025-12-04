// src/services/inventory.service.js
import prisma from "../../prisma/prismaClient.js";
import { sendEmail } from "../utils/mailer.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@yourdomain.com";

/**
 * Deduct stock for an array of items.
 * items = [{ productId, quantity }]
 * Throws on insufficient stock.
 */
export async function deductStock(items) {
  for (const item of items) {
    const inv = await prisma.inventory.findUnique({
      where: { productId: item.productId },
      include: { product: true },
    });

    if (!inv) throw new Error(`Inventory not found for productId ${item.productId}`);
    if (inv.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${inv.product.name}`);
    }

    const newStock = inv.stock - item.quantity;

    await prisma.inventory.update({
      where: { productId: item.productId },
      data: { stock: newStock },
    });

    // If newStock <= threshold (lowStock field), send alert
    if (newStock <= (inv.lowStock ?? 5)) {
      // create a DB notification or email to admin
      await sendLowStockAlert(inv.product.name, newStock, inv.lowStock);
    }
  }
}

/**
 * Restock a product (increase stock).
 */
export async function restockProduct(productId, quantity) {
  const inv = await prisma.inventory.findUnique({ where: { productId } });
  if (!inv) throw new Error("Inventory not found");

  const newStock = inv.stock + Number(quantity || 0);

  const updated = await prisma.inventory.update({
    where: { productId },
    data: { stock: newStock },
  });

  // If previously low and now ok, optionally notify admin that stock restored
  return updated;
}

/**
 * Admin: manually set stock or increment/decrement
 * action = { op: 'set'|'increment'|'decrement', value: number }
 */
export async function adjustStock(productId, action) {
  const inv = await prisma.inventory.findUnique({ where: { productId } });
  if (!inv) throw new Error("Inventory not found");

  let newStock = inv.stock;
  if (action.op === "set") newStock = Number(action.value);
  if (action.op === "increment") newStock = inv.stock + Number(action.value);
  if (action.op === "decrement") newStock = inv.stock - Number(action.value);

  if (newStock < 0) newStock = 0;

  const updated = await prisma.inventory.update({
    where: { productId },
    data: { stock: newStock },
  });

  // if newStock <= threshold notify
  if (updated.stock <= (inv.lowStock ?? 5)) {
    await sendLowStockAlert(inv.product.name, updated.stock, inv.lowStock);
  }

  return updated;
}

/**
 * Admin: set low stock threshold for an inventory record
 */
export async function setLowStockThreshold(productId, threshold) {
  const updated = await prisma.inventory.update({
    where: { productId },
    data: { lowStock: Number(threshold) },
  });
  return updated;
}

/**
 * Get all inventory records where stock <= lowStock threshold
 */
export async function getLowStockInventories() {
  return prisma.inventory.findMany({
    where: { stock: { lte: prisma.raw("low_stock") } }, // fallback: we'll filter in JS if raw not supported
    include: { product: true },
  }).catch(async () => {
    // fallback filtering in JS if DB raw not supported
    const all = await prisma.inventory.findMany({ include: { product: true } });
    return all.filter(i => i.stock <= (i.lowStock ?? 5));
  });
}

/**
 * Send an email alert to admin
 */
async function sendLowStockAlert(productName, remaining, threshold) {
  try {
    const html = `<p>⚠️ Low stock alert for <b>${productName}</b></p>
                  <p>Remaining: <b>${remaining}</b><br/>Threshold: <b>${threshold}</b></p>`;
    await sendEmail({
      to: process.env.ADMIN_EMAIL || ADMIN_EMAIL,
      subject: `Low stock: ${productName}`,
      html,
    });
  } catch (err) {
    console.error("Low stock email failed:", err);
  }
}
