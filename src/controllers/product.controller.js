import prisma from "../../prisma/prismaClient.js";
import slugify from "slugify";

/* ===========================
   ADMIN: CREATE PRODUCT
=========================== */
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, salePrice, categoryId, brandId, stock } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ message: "Name, price and category are required" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: slugify(name, { lower: true }),
        description,
        price,
        salePrice,
        categoryId,
        brandId,
        inventory: {
          create: {
            stock: stock ?? 0
          }
        }
      }
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to create product" });
  }
};

/* ===========================
   ADMIN: UPDATE PRODUCT
=========================== */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.product.update({
      where: { id },
      data: req.body
    });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
};

/* ===========================
   ADMIN: DELETE PRODUCT
=========================== */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

/* ===========================
   CUSTOMER: LIST PRODUCTS
   SEARCH + FILTER + SORT + PAGINATION
=========================== */
export const listProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, minPrice, maxPrice, sort } = req.query;

    const where = {
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive"
        }
      }),

      ...(category && {
        category: {
          is: { slug: category }
        }
      }),

      ...(minPrice || maxPrice
        ? {
            price: {
              gte: Number(minPrice || 0),
              lte: Number(maxPrice || 999999)
            }
          }
        : {})
    };

    const orderBy =
      sort === "low-high"
        ? { price: "asc" }
        : sort === "high-low"
        ? { price: "desc" }
        : { createdAt: "desc" };

    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        images: true,
        inventory: true,
        category: true,
        brand: true
      }
    });

    res.json(products);
  } catch (err) {
    console.error("LIST PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ===========================
   CUSTOMER: GET SINGLE PRODUCT
=========================== */
export const getSingleProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        inventory: true,
        category: true,
        brand: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* ===========================
   ADMIN: UPDATE STOCK (SAFE UPSERT)
=========================== */
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined) {
      return res.status(400).json({ message: "Stock value is required" });
    }

    const updated = await prisma.inventory.upsert({
      where: { productId: id },
      update: { stock },
      create: { productId: id, stock }
    });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE STOCK ERROR:", err);
    res.status(500).json({ message: "Failed to update stock" });
  }
};

/* ===========================
   ADMIN: UPLOAD PRODUCT IMAGES
=========================== */
export const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ message: "Images array is required" });
    }

    const data = images.map((url) => ({
      productId: id,
      imageUrl: url
    }));

    await prisma.productImage.createMany({ data });

    res.json({ message: "Product images uploaded successfully" });
  } catch (err) {
    console.error("UPLOAD IMAGE ERROR:", err);
    res.status(500).json({ message: "Failed to upload images" });
  }
};
