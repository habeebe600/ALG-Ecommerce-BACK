import prisma from "../../prisma/prismaClient.js";

/** ✅ USER: Add or Update Review */
export const addReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ message: "productId & rating required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // ✅ Check already reviewed (duplicate prevention)
    const existing = await prisma.review.findFirst({
      where: { userId, productId }
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    // ✅ Create Review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment
      }
    });

    // ✅ Auto Update Product Rating
    await updateProductRating(productId);

    res.status(201).json({ message: "Review added", review });
  } catch (err) {
    console.error("ADD REVIEW ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ✅ UPDATE PRODUCT RATING (AVG) */
const updateProductRating = async (productId) => {
  const reviews = await prisma.review.findMany({
    where: { productId }
  });

  // ✅ If no reviews left → reset rating to 0
  if (reviews.length === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { rating: 0 }
    });
    return;
  }

  // ✅ Calculate correct average
  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await prisma.product.update({
    where: { id: productId },
    data: { rating: parseFloat(avg.toFixed(1)) }
  });
};


/** ✅ GET PRODUCT REVIEWS */
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ reviews });
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ✅ ADMIN: Delete Review */
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.review.delete({ where: { id } });

    // ✅ Recalculate product rating safely
    await updateProductRating(review.productId);

    return res.json({ message: "Review deleted" });

  } catch (err) {
    console.error("DELETE REVIEW ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

