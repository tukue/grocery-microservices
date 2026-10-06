import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "../features/auth";
import { useCart } from "../features/cart";

export function StoreLayout() {
  const { session, logout, loading } = useSession();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string>();
  async function signOut() {
    setSigningOut(true);
    setError(undefined);
    try {
      await logout();
      navigate("/products");
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="announcement">
        Good food. Everyday essentials. One happy basket.
      </div>
      <header className="store-header">
        <Link to="/products" className="brand" aria-label="Grove Grocery home">
          <span className="brand-mark" aria-hidden="true">
            g.
          </span>{" "}
          grove<span className="brand-caption">GROCERY</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/products">Shop</NavLink>
          {session && <NavLink to="/orders">My orders</NavLink>}
          <NavLink to="/cart" className="basket-link">
            Basket{" "}
            <span
              className="basket-count"
              aria-label={`${itemCount} items in basket`}
            >
              {itemCount}
            </span>
          </NavLink>
        </nav>
        <div className="account-actions">
          {!loading &&
            (session ? (
              <>
                <span className="customer-email">{session.email}</span>
                <button
                  className="button-quiet"
                  disabled={signingOut}
                  onClick={() => void signOut()}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </>
            ) : (
              <Link className="button button-secondary" to="/login">
                Sign in
              </Link>
            ))}
        </div>
      </header>
      {error && (
        <p className="global-message" role="alert">
          {error}
        </p>
      )}
      <div id="main-content" tabIndex={-1} className="page-content">
        <Outlet />
      </div>
      <footer className="store-footer">
        <Link className="brand" to="/products">
          grove.
        </Link>
        <p>A little fresh inspiration for your everyday.</p>
        <nav aria-label="Footer navigation">
          <Link to="/products">Shop groceries</Link>
          <Link to="/cart">Your basket</Link>
          <Link to="/orders">Your orders</Link>
        </nav>
      </footer>
    </>
  );
}
