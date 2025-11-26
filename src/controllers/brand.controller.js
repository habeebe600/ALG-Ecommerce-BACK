import prisma from "../../prisma/prismaClient.js";

/* ADMIN: CREATE BRAND */
export const createBrand = async (req, res) => {
  try {
    const { name } = req.body;

    const brand = await prisma.brand.create({
      data: { name }
    });

    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ message: "Failed to create brand" });
  }
};

/* GET ALL BRANDS */
export const getAllBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch brands" });
  }
};

/* ADMIN: DELETE BRAND */
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.brand.delete({
      where: { id }
    });

    res.json({ message: "Brand deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete brand" });
  }
};
