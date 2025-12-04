export const getAllUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    include: { profile: true }
  });
  res.json(users);
};

export const blockUser = async (req, res) => {
  const { id } = req.params;
  await prisma.user.update({
    where: { id },
    data: { isVerified: false }
  });
  res.json({ message: "User blocked" });
};
