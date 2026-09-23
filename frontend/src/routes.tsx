import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import { LoginPage } from "./features/auth/components/login-page";
import { useSession } from "./features/auth/components/auth-context";
import { CartPage } from "./features/cart/components/CartPage";
import { useCart } from "./features/cart/components/cart-context";
import { ConfirmationPage } from "./features/orders/components/confirmation-page";
import { CheckoutPage } from "./features/orders/components/checkout-page";
import { OrderHistory } from "./features/orders/components/order-history";
import { ProductDetail } from "./features/products/components/product-detail";
import { ProductList } from "./features/products/components/ProductList";

function ProtectedRoute() {
  const { session, loading } = useSession();
  if (loading) return <div role="status">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function CartRoute() {
  const { adapter } = useCart();
  return <CartPage adapter={adapter} />;
}

function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <p>Page not found.</p>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/products" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/products", element: <ProductList /> },
  { path: "/products/:id", element: <ProductDetail /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/cart", element: <CartRoute /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/confirmation/:orderId", element: <ConfirmationPage /> },
      { path: "/orders", element: <OrderHistory /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
