import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Header from "./components/Header";
import { useAuth } from "./features/auth/components/auth-context";
import LoginPage from "./features/auth/components/LoginPage";
import CartPage from "./features/cart/components/CartPage";
import ProductDetailPage from "./features/products/components/product-detail";
import ProductListPage from "./features/products/components/product-list";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Shell() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <Navigate to="/products" replace /> },
      { path: "/login", element: <LoginPage /> },
      {
        path: "/products",
        element: (
          <RequireAuth>
            <ProductListPage />
          </RequireAuth>
        ),
      },
      {
        path: "/products/:id",
        element: (
          <RequireAuth>
            <ProductDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "/cart",
        element: (
          <RequireAuth>
            <CartPage />
          </RequireAuth>
        ),
      },
    ],
  },
]);
