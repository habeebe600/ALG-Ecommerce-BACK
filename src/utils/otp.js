// utils/otp.js

const otpStore = new Map(); // In-memory, switch to Redis for production

// Generate 6-digit OTP
export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp.length === 6 ? otp : generateOTP(); // Ensure 6 digits
};

// Save OTP temporarily for identifier (such as email)
export const saveOTP = (identifier, otp) => {
  otpStore.set(identifier, {
    code: otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
  });
};

// Verify OTP
export const verifyOTP = (identifier, otp) => {
  const record = otpStore.get(identifier);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    return false; // expired
  }
  if (record.code !== otp) return false;
  otpStore.delete(identifier); // One-time use
  return true;
};
