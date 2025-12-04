export const getAllOrdersAdmin = async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: true, user: true }
  });
  res.json(orders);
};

export const getLowStockProducts = async (req, res) => {
  const lowStock = await prisma.inventory.findMany({
    where: { stock: { lte: 5 } },
    include: { product: true }
  });
  res.json(lowStock);
};
