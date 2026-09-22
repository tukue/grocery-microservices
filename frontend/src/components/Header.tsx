import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/components/auth-context";
import { useCart } from "../features/cart/components/cart-context";

export default function Header() {
  const { isLoggedIn, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <Link to="/" className="brand">
          Grocery Store
        </Link>
        <Link to="/products">Products</Link>
        <Link to="/cart">
          Cart <span aria-label={`${cart.itemCount} items in cart`}>({cart.itemCount})</span>
        </Link>
        {isLoggedIn ? (
          <button type="button" onClick={handleLogout} className="linklike">
            Log out
          </button>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </nav>
    </header>
  );
}
