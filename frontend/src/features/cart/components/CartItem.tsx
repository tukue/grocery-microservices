import { useCart } from "./cart-context";
import QuantityControl from "./QuantityControl";
import type { CartItemDTO } from "../api/cart-schemas";

export default function CartItem({ item }: { item: CartItemDTO }) {
  const { removeItem, pendingItemId } = useCart();
  const isPending = item.id !== null && pendingItemId === item.id;

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <p className="cart-item-name">{item.productName}</p>
        <p className="cart-item-meta">
          ${item.price.toFixed(2)} each · Qty: {item.quantity}
        </p>
      </div>
      <div className="cart-item-actions">
        {item.id !== null ? (
          <QuantityControl
            itemId={item.id}
            productName={item.productName}
            quantity={item.quantity}
          />
        ) : null}
        <button
          type="button"
          disabled={isPending || item.id === null}
          onClick={() => item.id !== null && void removeItem(item.id)}
          className="danger"
        >
          Remove
        </button>
        <p className="cart-item-total">${(item.price * item.quantity).toFixed(2)}</p>
      </div>
    </div>
  );
}
