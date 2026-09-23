import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../../cart/components/cart-context";
import { submitOrderFromClient } from "../api/client-order-submission";
import type { CartSummary, Order } from "../domain/order";
import { CheckoutForm } from "./checkout-form";

function toSummary(
  cartId: number,
  items: ReadonlyArray<{
    productId: number;
    productName: string;
    price: number;
    quantity: number;
  }>,
): CartSummary {
  const lines = items.map((item) => ({
    lineTotal: Number((item.price * item.quantity).toFixed(2)),
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.price,
  }));
  const total = Number(
    lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2),
  );
  return { id: cartId, items: lines, total };
}

export function CheckoutPage() {
  const { cart, loading, error, refresh } = useCart();
  const navigate = useNavigate();

  const summary = useMemo(
    () => (cart ? toSummary(cart.id, cart.items) : null),
    [cart],
  );

  async function handleConfirmed(order: Order): Promise<void> {
    await refresh().catch(() => {});
    navigate(`/confirmation/${order.id}`);
  }

  if (loading) {
    return (
      <main>
        <div role="status">Loading checkout...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>Checkout</h1>
        <div role="alert">{error}</div>
        <Link to="/cart">Back to cart</Link>
      </main>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <main>
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Browse products</Link>
      </main>
    );
  }

  return (
    <main>
      <CheckoutForm
        cart={summary}
        submitOrder={(input) => submitOrderFromClient(input)}
        onConfirmed={(order) => void handleConfirmed(order)}
      />
      <div style={{ marginTop: "16px" }}>
        <Link to="/cart">Back to cart</Link>
      </div>
    </main>
  );
}
