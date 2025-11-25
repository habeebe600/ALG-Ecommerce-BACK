import prisma from "../../prisma/prismaClient.js";
import validator from "validator";

// UPDATE OR CREATE PROFILE
export const upsertProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { firstName, lastName, phone, avatar } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First and Last name are required" });
    }

    // Validate phone
    if (phone && !validator.isMobilePhone(phone, "any")) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Update phone if provided
    if (phone) {
      const phoneExists = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: userId },
        },
      });

      if (phoneExists) {
        return res.status(400).json({ message: "Phone number already in use" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { phone },
      });
    }

    // UPSERT PROFILE
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: { firstName, lastName, avatar },
      create: { userId, firstName, lastName, avatar },
    });

    return res.json({ message: "Profile updated successfully", profile });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET PROFILE
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, isVerified: true },
    });

    return res.json({ profile, account: user });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
