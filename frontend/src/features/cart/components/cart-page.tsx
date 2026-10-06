import { Link } from "react-router-dom";
import { useCart } from "./cart-context";
import { CartItem } from "./cart-item";

export function CartPage() {
  const { cart, error, loading, refresh, pendingItems } = useCart();
  if (loading)
    return (
      <main>
        <p role="status">Loading cart...</p>
      </main>
    );
  if (error && !cart)
    return (
      <main>
        <h1>Your Cart</h1>
        <p role="alert">{error}</p>
        <button onClick={() => void refresh()}>Try again</button>
      </main>
    );
  if (!cart || cart.items.length === 0 || cart.status !== "OPEN")
    return (
      <main>
        <div className="page-title">
          <p className="eyebrow">YOUR EVERYDAY ESSENTIALS</p>
          <h1>Your Cart</h1>
        </div>
        <div className="state-panel">
          <h2>A good basket starts here</h2>
          <p>Your cart is empty.</p>
          <Link className="button" to="/products">
            Browse products
          </Link>
          <p>
            <button className="button-quiet" disabled>
              Proceed to Checkout
            </button>
          </p>
        </div>
      </main>
    );
  const total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return (
    <main>
      <div className="page-title">
        <p className="eyebrow">YOUR EVERYDAY ESSENTIALS</p>
        <h1>Your Cart</h1>
        <p>Review your favourites before you check out.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="shopping-layout">
        <section>
          <ul className="cart-lines">
            {cart.items.map((item) => (
              <CartItem item={item} key={item.id} />
            ))}
          </ul>
          <p style={{ marginTop: 24 }}>
            <Link to="/products">← Continue shopping</Link>
          </p>
        </section>
        <aside className="summary-card" aria-label="Basket summary">
          <h2>Your basket</h2>
          <p>
            {cart.items.reduce((sum, item) => sum + item.quantity, 0)} items
          </p>
          <p className="summary-total">Cart total: {total.toFixed(2)}</p>
          <small>
            Based on the prices in your basket. Your final total is confirmed
            when you place your order.
          </small>
          {pendingItems.size > 0 ? (
            <button disabled>Updating basket...</button>
          ) : (
            <Link className="button" to="/checkout">
              Proceed to Checkout →
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
