 import prisma from "../../../prisma/prismaClient.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalRevenue = await prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: { paymentStatus: "paid" }
    });

    const totalOrders = await prisma.order.count();
    const totalUsers = await prisma.user.count();

    const todayOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0))
        }
      }
    });

    return res.json({
      totalRevenue: totalRevenue._sum.finalAmount || 0,
      totalOrders,
      totalUsers,
      todayOrders
    });
  } catch (err) {
    res.status(500).json({ message: "Dashboard error" });
  }
};
