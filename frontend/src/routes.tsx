import { createBrowserRouter, Navigate } from "react-router-dom";

function ProductList() {
  return (
    <main>
      <h1>Products</h1>
      <p>Product catalogue coming soon.</p>
    </main>
  );
}

function ProductDetail() {
  return (
    <main>
      <h1>Product Detail</h1>
      <p>Product detail page coming soon.</p>
    </main>
  );
}

function CartPage() {
  return (
    <main>
      <h1>Your Cart</h1>
      <p>Cart page coming soon.</p>
    </main>
  );
}

function CheckoutPage() {
  return (
    <main>
      <h1>Checkout</h1>
      <p>Checkout page coming soon.</p>
    </main>
  );
}

function ConfirmationPage() {
  return (
    <main>
      <h1>Order Confirmed</h1>
      <p>Confirmation page coming soon.</p>
    </main>
  );
}

function OrderHistory() {
  return (
    <main>
      <h1>Order History</h1>
      <p>Order history coming soon.</p>
    </main>
  );
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
  { path: "/products", element: <ProductList /> },
  { path: "/products/:id", element: <ProductDetail /> },
  { path: "/cart", element: <CartPage /> },
  { path: "/checkout", element: <CheckoutPage /> },
  { path: "/confirmation/:orderId", element: <ConfirmationPage /> },
  { path: "/orders", element: <OrderHistory /> },
  { path: "*", element: <NotFound /> },
]);
