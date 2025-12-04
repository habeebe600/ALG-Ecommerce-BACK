// src/utils/notification.service.js
import prisma from "../../prisma/prismaClient.js";
import { io } from "../app.js"; // imported export from server
import { sendEmail } from "./mailer.js"; // email helper

/**
 * sendNotification - save to DB + emit to socket + optionally send email
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} [opts.referenceId]
 * @param {string} opts.message
 * @param {string} [opts.type] // PORTAL | EMAIL | SYSTEM
 * @param {boolean} [opts.sendEmailAlso] // default false
 */
export async function sendNotification({
    
  userId = null,
  referenceId = null,
  message,
  type = "PORTAL",
  sendEmailAlso = false,
}) {
    console.log('🔔 sendNotification called:', { userId, message, type });
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        referenceId,
        type,
        message,
        status: sendEmailAlso ? "PENDING" : "DELIVERED"
      },
    });

    // Emit real-time to the user's room
    if (userId) {
      io.to(`user_${userId}`).emit("notification", {
        id: notification.id,
        message: notification.message,
        referenceId: notification.referenceId,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    } else {
      // optional: broadcast to all
      io.emit("notification", {
        id: notification.id,
        message: notification.message,
        referenceId: notification.referenceId,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    // Optionally send email
    if (sendEmailAlso && userId) {
      const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { email: true }
});

if (!user?.email) {
  console.error(`❌ EMAIL NOT FOUND FOR USER: ${userId}`);
  return notification;
}

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Alg E-commerce Notification",
          text: message,
        });

        // mark notification delivered
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: "DELIVERED", deliveredAt: new Date() }
        });
      }
    }

    return notification;
  } catch (err) {
    console.error("sendNotification ERROR", err);
    return null;
  }
}
