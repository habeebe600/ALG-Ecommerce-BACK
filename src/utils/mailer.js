// utils/mailer.js

import nodemailer from "nodemailer";

// You can add a secondary email provider as fallback if needed

let transporter;
try {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // TLS port
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // should be an App Password
    },
  });
} catch (error) {
  console.error("❌ Gmail transporter setup failed:", error);
}

export const sendEmail = async (to, subject, html) => {
  try {
    if (!transporter) throw new Error("Transporter not set up");
    await transporter.sendMail({
      from: `"ALG DATA GUARD" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📩 Email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return false;
  }
};
