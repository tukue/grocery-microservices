import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { LoginPage } from "./features/auth/components/login-page";
import { useSession } from "./features/auth/components/auth-context";
import { CartPage } from "./features/cart/components/cart-page";
import { ConfirmationPage } from "./features/orders/components/confirmation-page";
import { CheckoutPage } from "./features/orders/components/checkout-page";
import { OrderHistory } from "./features/orders/components/order-history";
import { ProductDetail } from "./features/products/components/product-detail";
import { ProductList } from "./features/products/components/product-list";
import { StoreLayout } from "./app/store-layout";

function ProtectedRoute() {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return <div role="status">Loading...</div>;
  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  return <Outlet />;
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
  {
    element: <StoreLayout />,
    children: [
      { path: "/", element: <Navigate to="/products" replace /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/products", element: <ProductList /> },
      { path: "/products/:id", element: <ProductDetail /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/cart", element: <CartPage /> },
          { path: "/checkout", element: <CheckoutPage /> },
          { path: "/confirmation/:orderId", element: <ConfirmationPage /> },
          { path: "/orders", element: <OrderHistory /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
