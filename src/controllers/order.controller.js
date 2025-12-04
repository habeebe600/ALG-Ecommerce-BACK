import prisma from "../../prisma/prismaClient.js";
import { sendNotification } from "../utils/notification.service.js";
import { deductStock } from "../services/inventory.service.js";
import { restockProduct } from "../services/inventory.service.js";

/** Create Order from cart */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shippingAddressId, couponId } = req.body;

    // 1️⃣ Find user's cart
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2️⃣ Calculate total
    let totalAmount = 0;
    cart.items.forEach((item) => {
      totalAmount += item.price * item.quantity;
    });

    let finalAmount = totalAmount;
    let appliedCoupon = null;

    if (couponId) {
      appliedCoupon = await prisma.coupon.findUnique({
        where: { id: couponId }
      });

      if (!appliedCoupon || !appliedCoupon.isActive)
        return res.status(400).json({ message: "Invalid coupon" });

      let discount =
        appliedCoupon.discountType === "percentage"
          ? (totalAmount * appliedCoupon.discountValue) / 100
          : appliedCoupon.discountValue;

      if (appliedCoupon.maxDiscount)
        discount = Math.min(discount, appliedCoupon.maxDiscount);

      finalAmount -= discount;

      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } }
      });
    }

    // 3️⃣ Create order
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        finalAmount,
        couponId,
        shippingAddressId,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
          })),
        },
      },
    });

    // 4️⃣ Deduct inventory using service
await deductStock(
  cart.items.map(i => ({
    productId: i.productId,
    quantity: i.quantity
  }))
);


    // 5️⃣ Clear cart after order
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    
    await prisma.orderTracking.create({
      data: {
        orderId: order.id,
        status: "pending",
        message: "Order placed successfully"
      }
    });
    //  notification After order created 
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: true } }
      }
    });
    
    const { generateOrderEmail } = await import("../utils/orderEmailTemplate.js");

    await sendNotification({
      userId: order.userId,
      referenceId: order.id,
      message: generateOrderEmail(fullOrder, "Your order has been placed successfully"),
      sendEmailAlso: true
    });

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order.id,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ message: "Failed to place order" });
  }

};



/** Get user orders */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ orders });
  } catch (err) {
    console.error("GET USER ORDERS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Admin: Get all orders */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ orders });
  } catch (err) {
    console.error("GET ALL ORDERS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Update order status (admin) */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status required" });

    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });

    await prisma.orderTracking.create({
  data: {
    orderId: updated.id,
    status,
    message: `Order marked as ${status}`
  }
});


    // ✅ SHIPPED NOTIFICATION
    if (status === "shipped") {
      const fullOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } }
      });

      const { generateOrderEmail } = await import("../utils/orderEmailTemplate.js");

      await sendNotification({
        userId: updated.userId,
        referenceId: updated.id,
        message: generateOrderEmail(fullOrder, "Your order has been shipped"),
        sendEmailAlso: true
      });
    }


    // ✅ DELIVERED NOTIFICATION
    if (status === "delivered") {
      const fullOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } }
      });

      const { generateOrderEmail } = await import("../utils/orderEmailTemplate.js");

      await sendNotification({
        userId: updated.userId,
        referenceId: updated.id,
        message: generateOrderEmail(fullOrder, "Your order has been delivered successfully"),
        sendEmailAlso: true
      });
    }


    return res.json({ message: "Order status updated", order: updated });
  } catch (err) {
    console.error("UPDATE ORDER STATUS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Cancel order (user) */
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "cancelled", paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus }
    });

    await prisma.orderTracking.create({
  data: {
    orderId: updated.id,
    status: "cancelled",
    message: "Order cancelled by customer"
  }
});

    // SEND NOTIFICATION on order cancel
    const fullOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });

    const { generateOrderEmail } = await import("../utils/orderEmailTemplate.js");

    await sendNotification({
      userId: order.userId,
      referenceId: order.id,
      message: generateOrderEmail(fullOrder, "Your order has been cancelled"),
      sendEmailAlso: true
    });


    // OPTIONAL: restore stock if you reduced on order creation
   const items = await prisma.orderItem.findMany({ where: { orderId: id } });

for (const it of items) {
  await restockProduct(it.productId, it.quantity);
}

    return res.json({ message: "Order cancelled", order: updated });
  } catch (err) {
    console.error("CANCEL ORDER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
