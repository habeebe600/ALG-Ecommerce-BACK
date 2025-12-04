import prisma from "../../prisma/prismaClient.js";
import { sendNotification } from "../utils/notification.service.js";
import { restockProduct } from "../services/inventory.service.js";

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

    // ✅ Notify user: Return request submitted
const fullOrder = await prisma.order.findUnique({
  where: { id: orderId },
  include: { items: { include: { product: true } } }
});

const { generateReturnEmail } = await import("../utils/orderEmailTemplate.js");

await sendNotification({
  userId,
  referenceId: orderId,
  message: generateReturnEmail(
    fullOrder,
    "Your return request has been submitted",
    reason
  ),
  sendEmailAlso: true
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

    await prisma.orderTracking.create({
  data: {
    orderId: ret.orderId,
    status: "return-approved",
    message: "Return request approved"
  }
});

    // ✅ Send notification based on return status
const fullOrder = await prisma.order.findUnique({
  where: { id: ret.orderId },
  include: { items: { include: { product: true } } }
});

const { generateReturnEmail } = await import("../utils/orderEmailTemplate.js");

let title = "";

if (status === "approved") {
  title = "✅ Your return request has been approved";
}

if (status === "rejected") {
  title = "❌ Your return request has been rejected";
}

if (status === "refunded") {
  title = "💰 Your refund has been completed";
}

if (title) {
  await sendNotification({
    userId: ret.userId,
    referenceId: ret.orderId,
    message: generateReturnEmail(fullOrder, title),
    sendEmailAlso: true
  });
}



    // ✅ RESTORE STOCK AFTER APPROVAL
     if (status === "approved") {
      const items = await prisma.orderItem.findMany({
        where: { orderId: ret.orderId }
      });

      for (const it of items) {
        await restockProduct(it.productId, it.quantity);
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

    await prisma.orderTracking.create({
  data: {
    orderId: newOrder.id,
    status: "replacement-created",
    message: "Replacement order created"
  }
});

    /* notification After replacement created */
const fullReplacementOrder = await prisma.order.findUnique({
  where: { id: newOrder.id },
  include: { items: { include: { product: true } } }
});

const { generateOrderEmail } = await import("../utils/orderEmailTemplate.js");

await sendNotification({
  userId: ret.userId,
  referenceId: newOrder.id,
  message: generateOrderEmail(
    fullReplacementOrder,
    "🔁 Your replacement order has been created successfully"
  ),
  sendEmailAlso: true
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
