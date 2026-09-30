import type { CartItemResponse } from "../api/cart.schemas";
import { useCart } from "./cart-context";

export function CartItem({ item }: { item: CartItemResponse }) {
  const { pendingItems, removeItem, updateItem } = useCart();
  const pending = pendingItems.has(item.id);
  return (
    <li aria-label={`${item.productName}, quantity ${item.quantity}`}>
      <strong>{item.productName}</strong> — {item.price.toFixed(2)} ×{" "}
      {item.quantity}{" "}
      <button
        aria-label="Decrease quantity"
        disabled={pending || item.quantity <= 1}
        onClick={() => void updateItem(item.id, item.quantity - 1)}
      >
        -
      </button>
      <button
        aria-label="Increase quantity"
        disabled={pending}
        onClick={() => void updateItem(item.id, item.quantity + 1)}
      >
        +
      </button>
      <button
        aria-label={`Remove ${item.productName}`}
        disabled={pending}
        onClick={() => void removeItem(item.id)}
      >
        Remove
      </button>
    </li>
  );
}
