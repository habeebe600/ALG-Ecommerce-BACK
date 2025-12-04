import prisma from "../../prisma/prismaClient.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { onlyUnread = "false", limit = 50 } = req.query;

    const where = { userId };
    if (onlyUnread === "true") where.isRead = false;

    const notifs = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit)
    });

    return res.json(notifs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    return res.json({ unreadCount: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.status(404).json({ message: "Not found" });
    if (notif.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, deliveredAt: new Date() }
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, deliveredAt: new Date() }
    });
    return res.json({ message: "All marked as read" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
