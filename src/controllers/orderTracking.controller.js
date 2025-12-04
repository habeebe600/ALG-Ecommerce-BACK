import prisma from "../../prisma/prismaClient.js";

/** USER & ADMIN — Get Order Tracking Timeline */
export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;

    const tracking = await prisma.orderTracking.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" }
    });

    return res.json({ tracking });
  } catch (err) {
    console.error("TRACKING ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
