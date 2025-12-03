import prisma from "../../prisma/prismaClient.js";

/** Create Coupon (Admin Only) */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      expiresAt,
      usageLimit
    } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscount,
        expiresAt,
        usageLimit
      }
    });

    res.status(201).json({ message: "Coupon created", coupon });
  } catch (err) {
    console.error("CREATE COUPON ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** Validate Coupon */
export const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive)
      return res.status(400).json({ message: "Invalid coupon" });

    if (coupon.expiresAt && new Date() > coupon.expiresAt)
      return res.status(400).json({ message: "Coupon expired" });

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return res.status(400).json({ message: "Coupon limit reached" });

    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue)
      return res.status(400).json({ message: "Order too small for coupon" });

    let discount =
      coupon.discountType === "percentage"
        ? (cartTotal * coupon.discountValue) / 100
        : coupon.discountValue;

    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);

    res.json({
      valid: true,
      discount,
      couponId: coupon.id
    });
  } catch (err) {
    console.error("VALIDATE COUPON ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
