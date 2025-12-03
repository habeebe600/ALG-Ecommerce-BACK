import prisma from "../../prisma/prismaClient.js";

/** ✅ USER: Request Return */
export const requestReturn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ message: "orderId & reason required" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

   if (order.status !== "delivered") {
  return res.status(400).json({
    message: "Return only allowed after order is delivered"
  });
}


    const existing = await prisma.orderReturn.findFirst({
      where: { orderId }
    });

    if (existing) {
      return res.status(400).json({ message: "Return already requested" });
    }

    const newReturn = await prisma.orderReturn.create({
      data: { orderId, userId, reason }
    });

    return res.status(201).json({
      message: "Return request submitted",
      return: newReturn
    });
  } catch (err) {
    console.error("REQUEST RETURN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** ✅ USER: View My Returns */
export const getMyReturns = async (req, res) => {
  try {
    const userId = req.user.userId;

    const returns = await prisma.orderReturn.findMany({
      where: { userId },
      include: {
        order: { include: { items: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ returns });
  } catch (err) {
    console.error("GET RETURNS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** ✅ ADMIN: Get All Returns */
export const getAllReturns = async (req, res) => {
  try {
    const returns = await prisma.orderReturn.findMany({
      include: { order: true, user: true },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ returns });
  } catch (err) {
    console.error("GET ALL RETURNS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** ✅ ADMIN: Update Return Status */
export const updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected", "refunded"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const ret = await prisma.orderReturn.findUnique({ where: { id } });
    if (!ret) return res.status(404).json({ message: "Return not found" });

    const updated = await prisma.orderReturn.update({
      where: { id },
      data: { status }
    });

    // ✅ RESTORE STOCK AFTER APPROVAL
    if (status === "approved") {
      const items = await prisma.orderItem.findMany({
        where: { orderId: ret.orderId }
      });

      for (const item of items) {
        await prisma.inventory.update({
          where: { productId: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }

    return res.json({
      message: "Return updated",
      return: updated
    });
  } catch (err) {
    console.error("UPDATE RETURN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/** ✅ ADMIN: Create Replacement Order */
export const createReplacement = async (req, res) => {
  try {
    const { returnId } = req.params;

    const ret = await prisma.orderReturn.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true } } }
    });

    if (!ret) return res.status(404).json({ message: "Return not found" });
    if (ret.status !== "approved") {
      return res.status(400).json({ message: "Return must be approved first" });
    }

    // ✅ Prevent duplicate replacement creation
const existingReplacement = await prisma.order.findFirst({
  where: {
    userId: ret.userId,
    isReplacement: true,
    status: { not: "cancelled" }
  }
});

if (existingReplacement) {
  return res.status(400).json({
    message: "Replacement already created for this return"
  });
}


    // ✅ Create New Replacement Order
    const newOrder = await prisma.order.create({
      data: {
        userId: ret.userId,
        totalAmount: ret.order.totalAmount,
        isReplacement: true,
        status: "confirmed",
        items: {
          create: ret.order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal
          }))
        }
      }
    });

    // ✅ Mark original order as replaced
    await prisma.order.update({
      where: { id: ret.orderId },
      data: { status: "replaced" }
    });

    // ✅ Mark return as refunded (completed)
    await prisma.orderReturn.update({
      where: { id: returnId },
      data: { status: "refunded" }
    });

    return res.json({
      message: "Replacement order created",
      newOrder
    });

  } catch (err) {
    console.error("REPLACEMENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
