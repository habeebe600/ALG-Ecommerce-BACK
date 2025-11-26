import prisma from "../../prisma/prismaClient.js";

/* ===========================
   ADMIN: CREATE CATEGORY
=========================== */
export const createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    const existing = await prisma.productCategory.findUnique({
      where: { slug }
    });

    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = await prisma.productCategory.create({
      data: { name, slug }
    });

    res.status(201).json(category);
  } catch (err) {
    console.error("CREATE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
};

/* ===========================
   CUSTOMER: LIST CATEGORIES
=========================== */
export const listCategories = async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json(categories);
  } catch (err) {
    console.error("LIST CATEGORY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};
