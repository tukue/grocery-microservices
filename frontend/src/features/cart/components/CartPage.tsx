import { Link } from "react-router-dom";
import { useAuth } from "../../auth/components/auth-context";
import { useCart } from "./cart-context";
import CartItem from "./CartItem";

export default function CartPage() {
  const { isLoggedIn } = useAuth();
  const { cart, loading, error } = useCart();

  const isCheckoutDisabled = cart.items.length === 0 || !isLoggedIn || loading;

  return (
    <main className="page">
      <h1>Shopping Cart</h1>

      {loading ? <p>Loading your cart…</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && cart.items.length === 0 ? (
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link to="/products">Continue shopping</Link>
        </div>
      ) : null}

      <section className="cart-list">
        {cart.items.map((item, index) => (
          <CartItem key={item.id ?? `line-${index}`} item={item} />
        ))}
      </section>

      {cart.items.length > 0 ? (
        <>
          <p className="cart-total" data-testid="cart-total">
            Total: ${cart.total.toFixed(2)}
          </p>
          {!isLoggedIn && !loading ? (
            <p>
              <Link to="/login">Log in</Link> to check out with your saved cart.
            </p>
          ) : null}
          <div className="actions">
            <Link
              to="/checkout"
              aria-disabled={isCheckoutDisabled}
              onClick={(event) => {
                if (isCheckoutDisabled) {
                  event.preventDefault();
                }
              }}
              className={isCheckoutDisabled ? "btn btn-disabled" : "btn btn-primary"}
            >
              Proceed to Checkout
            </Link>
            <Link to="/products" className="btn">
              Continue shopping
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
