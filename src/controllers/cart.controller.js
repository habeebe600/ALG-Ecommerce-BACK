import prisma from "../../prisma/prismaClient.js";

/**
 * Add item to cart (create cart if not exists)
 * - If user logged in: use userId
 * - Optionally support sessionId (guest)
 * Body: { productId, quantity }
 */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { productId, quantity = 1, sessionId } = req.body;

    if (!productId) return res.status(400).json({ message: "productId required" });
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: "quantity must be integer >=1" });

    // get product + stock + price snapshot
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true }
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // check stock
    if (product.inventory && product.inventory.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // find or create cart
    const cart = await prisma.cart.upsert({
      where: userId ? { userId } : { sessionId },
      // upsert requires unique, ensure you have unique constraint; if not, implement find/create logic:
      // We'll use simple findFirst/create fallback to avoid schema uniqueness issues
      create: {
        userId,
        sessionId: sessionId ?? null
      },
      update: {}
    }).catch(async () => {
      // Fallback: find or create
      let found = null;
      if (userId) found = await prisma.cart.findFirst({ where: { userId } });
      else if (sessionId) found = await prisma.cart.findFirst({ where: { sessionId } });

      if (!found) {
        return await prisma.cart.create({ data: { userId, sessionId: sessionId ?? null } });
      }
      return found;
    });

    // check if cart item exists
    let cartItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId }
    });

    if (cartItem) {
      // increment quantity
      cartItem = await prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity: cartItem.quantity + quantity, price: product.price }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: product.price
        }
      });
    }

    return res.json({ message: "Added to cart", cartItem });
  } catch (err) {
    console.error("ADD TO CART ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Get current user's cart */
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const sessionId = req.query.sessionId || null;

    const where = userId ? { userId } : { sessionId };

    const cart = await prisma.cart.findFirst({
      where,
      include: {
        items: {
          include: {
            product: {
              include: { images: true, inventory: true, category: true, brand: true }
            }
          }
        }
      }
    });

    if (!cart) return res.json({ items: [], total: 0 });

    // calculate totals
    let total = 0;
    cart.items.forEach(item => { total += item.price * item.quantity; });

    return res.json({ cartId: cart.id, items: cart.items, total });
  } catch (err) {
    console.error("GET CART ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Update cart item quantity */
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ message: "Invalid quantity" });

    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    // ownership check (ensure item belongs to user's cart)
    const cart = await prisma.cart.findUnique({ where: { id: item.cartId } });
    if (userId && cart.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return res.json({ message: "Item removed" });
    }

    // check stock
    const product = await prisma.product.findUnique({ where: { id: item.productId }, include: { inventory: true } });
    if (product.inventory && product.inventory.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    return res.json({ message: "Cart item updated", item: updated });
  } catch (err) {
    console.error("UPDATE CART ITEM ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Remove item from cart */
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { itemId } = req.params;

    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    const cart = await prisma.cart.findUnique({ where: { id: item.cartId } });
    if (userId && cart.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    await prisma.cartItem.delete({ where: { id: itemId } });
    return res.json({ message: "Item removed" });
  } catch (err) {
    console.error("REMOVE CART ITEM ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** Clear cart */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ comes from auth middleware

    const cart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("CLEAR CART ERROR:", error);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};

