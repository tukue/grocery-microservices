import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/components/auth-context";
import { CartProvider } from "./features/cart/components/cart-context";
import { router } from "./routes";
import "./index.css";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </AuthProvider>
  );
}
