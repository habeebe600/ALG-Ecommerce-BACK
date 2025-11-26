export const validateProduct = (req, res, next) => {
  const { name, description, price, categoryId, stock } = req.body;

  if (!name || !description || !price || !categoryId) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  if (typeof price !== "number") {
    return res.status(400).json({ message: "Price must be a number" });
  }

  if (stock !== undefined && !Number.isInteger(stock)) {
    return res.status(400).json({ message: "Stock must be a whole number" });
  }

  next();
};
