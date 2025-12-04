export const getSalesAnalytics = async (req, res) => {
  const data = await prisma.order.groupBy({
    by: ["createdAt"],
    _sum: { finalAmount: true }
  });

  res.json(data);
};

export const getTopProducts = async (req, res) => {
  const products = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10
  });

  res.json(products);
};
