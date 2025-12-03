import prisma from "../../prisma/prismaClient.js";

/** Get User Wishlist */
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wishlist = await prisma.wishlist.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true }
            }
          }
        }
      }
    });

    if (!wishlist) {
      return res.json({ items: [] });
    }

    res.json(wishlist);
  } catch (err) {
    console.error("GET WISHLIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/** Add Item To Wishlist */
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    let wishlist = await prisma.wishlist.findFirst({ where: { userId } });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId }
      });
    }

    const exists = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId
      }
    });

    if (exists) {
      return res.status(400).json({ message: "Already in wishlist" });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId
      }
    });

    res.status(201).json({ message: "Added to wishlist", item });

  } catch (err) {
    console.error("ADD WISHLIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/** Remove From Wishlist */
export const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.wishlistItem.delete({ where: { id } });

    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    console.error("REMOVE WISHLIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
