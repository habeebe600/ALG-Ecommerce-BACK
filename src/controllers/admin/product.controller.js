export const getAllProductsAdmin = async (req, res) => {
  const products = await prisma.product.findMany({
    include: { inventory: true }
  });
  res.json(products);
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  await prisma.product.delete({ where: { id } });
  res.json({ message: "Product deleted" });
};
