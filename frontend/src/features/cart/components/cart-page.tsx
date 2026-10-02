import { Link } from "react-router-dom";
import { useCart } from "./cart-context";
import { CartItem } from "./cart-item";

export function CartPage() {
  const { cart, error, loading } = useCart();
  if (loading) return <p role="status">Loading cart...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!cart || cart.items.length === 0)
    return (
      <main>
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Browse products</Link>
        <button disabled>Proceed to Checkout</button>
      </main>
    );
  const total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return (
    <main>
      <h1>Your Cart</h1>
      <ul>
        {cart.items.map((item) => (
          <CartItem item={item} key={item.id} />
        ))}
      </ul>
      <p>Cart total: {total.toFixed(2)}</p>
      <Link to="/checkout">Proceed to Checkout</Link>
    </main>
  );
}
