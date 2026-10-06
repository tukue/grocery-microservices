import { useState } from "react";
import type { CartItem as CartLine } from "../domain/cart";
import { useCart } from "./cart-context";

export function CartItem({ item }: { item: CartLine }) {
  const { pendingItems, removeItem, updateItem } = useCart();
  const [error, setError] = useState<string>();
  const pending = pendingItems.size > 0;
  async function mutate(operation: () => Promise<unknown>) {
    setError(undefined);
    try {
      await operation();
    } catch {
      setError("Could not update your cart. Please try again.");
    }
  }
  return (
    <li
      className="cart-line"
      aria-label={`${item.productName}, quantity ${item.quantity}`}
    >
      <span className="line-symbol" aria-hidden="true">
        {item.productName.slice(0, 1)}
      </span>
      <div className="line-info">
        <strong>{item.productName}</strong>
        <small>
          {item.price.toFixed(2)} × {item.quantity}
        </small>
      </div>
      <div className="quantity-controls">
        <button
          aria-label="Decrease quantity"
          disabled={pending || item.quantity <= 1}
          onClick={() =>
            void mutate(() => updateItem(item.id, item.quantity - 1))
          }
        >
          −
        </button>
        <span aria-live="polite">{item.quantity}</span>
        <button
          aria-label="Increase quantity"
          disabled={pending}
          onClick={() =>
            void mutate(() => updateItem(item.id, item.quantity + 1))
          }
        >
          +
        </button>
      </div>
      <button
        className="remove-button"
        aria-label={`Remove ${item.productName}`}
        disabled={pending}
        onClick={() => void mutate(() => removeItem(item.id))}
      >
        Remove
      </button>
      {error && <p role="alert">{error}</p>}
    </li>
  );
}
