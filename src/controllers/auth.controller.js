import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/prismaClient.js";
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/mailer.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import { validatePassword } from "../utils/validationUtils.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be 8+ characters, include uppercase, number, and special symbol"
      });
    }

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: "customer",
        isVerified: false
      }
    });

    // Optionally save password to history here (optional)
    await prisma.passwordHistory.create({
      data: { userId: user.id, passwordHash: hashedPassword }
    });

    const code = generateOTP();
    saveOTP(email, code);

    await sendEmail(
      email,
      "Verify your Account",
      `<p>Your OTP is: <b>${code}</b> (valid for 5 minutes)</p>`
    );

    return res.status(201).json({
      message: "Registration successful! Please verify your email using the OTP sent.",
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified }
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================= VERIFY ACCOUNT =================
export const verifyAccount = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const isValid = verifyOTP(email, otp);
    if (!isValid)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true }
    });
    res.json({ message: "Account verified successfully!" });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESEND VERIFICATION OTP =================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Create new OTP
    const code = generateOTP();
    saveOTP(email, code);

    await sendEmail(
      email,
      "Verify your Account - New OTP",
      `<p>Your new OTP is: <b>${code}</b> (valid for 5 minutes)</p>`
    );

    return res.json({ message: "New OTP sent successfully!" });

  } catch (err) {
    console.error("RESEND OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your account first" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
  { userId: user.id, role: user.role }, // user.id is String (uuid)
  JWT_SECRET,
  { expiresIn: "1d" }
);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// ================= FORGOT PASSWORD SEND OTP =================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const code = generateOTP();
    saveOTP(email, code);

    await sendEmail(
      email,
      "Password Reset OTP",
      `<p>Your OTP is: <b>${code}</b> (valid for 5 minutes)</p>`
    );

    res.json({ message: "OTP sent for password reset" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "Email, OTP and new password are required" });

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be 8+ characters, include uppercase, number, and special symbol"
      });
    }

    const isValid = verifyOTP(email, otp);
    if (!isValid)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Check last 3 passwords
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3
    });
    for (let record of history) {
      const match = await bcrypt.compare(newPassword, record.passwordHash);
      if (match) {
        return res.status(400).json({ message: "Cannot reuse last 3 passwords" });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword }
    });

    // Save new password in history
    await prisma.passwordHistory.create({
      data: { userId: user.id, passwordHash: hashedPassword }
    });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CHANGE PASSWORD =================
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId; // String uuid

    if (!userId) {
      console.error("CHANGE PASSWORD: Missing userId on req.user:", req.user);
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }, // id is String in schema.prisma
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters, include uppercase, number, and special symbol",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Add to password history
    await prisma.passwordHistory.create({
      data: {
        userId,              // String uuid, matches schema
        passwordHash: newHash,
      },
    });

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGOUT =================
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ message: "Token not provided" });

    addToBlacklist(token);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE USER BY EMAIL =================
export const deleteUserByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await prisma.user.delete({ where: { email } });

    res.json({ message: `User with email ${email} deleted successfully` });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
