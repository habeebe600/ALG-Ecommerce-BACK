export function generateOrderEmail(order, title) {
  const itemsList = order.items
    .map(item => `• ${item.product.name} × ${item.quantity}`)
    .join("\n");

  return `
✅ ${title}

🧾 Order Summary:
${itemsList}

💰 Total Amount: ₹${order.finalAmount}
🚚 Current Status: ${order.status.toUpperCase()}

Thank you for shopping with ALG Data Guard.
We’ll notify you again when your order status changes.

— ALG Data Guard Team
`;
}

export function generateReturnEmail(order, title, reason = null) {
  const itemsList = order.items
    .map(item => `• ${item.product.name} × ${item.quantity}`)
    .join("\n");

  return `
✅ ${title}

🧾 Order Summary:
${itemsList}

💰 Order Amount: ₹${order.finalAmount}
📦 Order Status: ${order.status.toUpperCase()}

${reason ? `📝 Return Reason: ${reason}\n` : ""}

Thank you for shopping with ALG Data Guard.
— ALG Data Guard Team
`;
}

