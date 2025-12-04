// utils/mailer.js
import nodemailer from "nodemailer";

let transporter;
try {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password
    },
  });
} catch (error) {
  console.error("❌ Gmail transporter setup failed:", error);
}

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!transporter) throw new Error("Transporter not set up");

    if (!to) {
      console.error("❌ EMAIL FAILED: No recipient provided");
      return false;
    }

    await transporter.sendMail({
      from: `"ALG DATA GUARD" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`📩 Email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return false;
  }
};
