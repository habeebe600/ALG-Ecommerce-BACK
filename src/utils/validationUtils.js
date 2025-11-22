// utils/validationUtils.js

// Password must have uppercase, number, symbol, min 8 chars
export const validatePassword = (password) => {
  const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  return regex.test(password);
};
