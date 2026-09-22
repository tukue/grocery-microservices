import { useCart } from "./cart-context";

type QuantityControlProps = {
  itemId: number;
  productName: string;
  quantity: number;
  disabled?: boolean;
};

export default function QuantityControl({ itemId, productName, quantity, disabled = false }: QuantityControlProps) {
  const { updateItem, pendingItemId } = useCart();
  const isPending = pendingItemId === itemId || disabled;

  function handleChange(nextQuantity: number) {
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      return;
    }
    void updateItem(itemId, nextQuantity);
  }

  return (
    <div className="qty-control">
      <button
        type="button"
        disabled={isPending || quantity <= 0}
        onClick={() => handleChange(quantity - 1)}
        aria-label={`Decrease quantity for ${productName}`}
      >
        -
      </button>
      <input
        type="number"
        min={0}
        step={1}
        value={quantity}
        disabled={isPending}
        onChange={(event) => handleChange(Number(event.target.value))}
        aria-label={`Quantity for ${productName}`}
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleChange(quantity + 1)}
        aria-label={`Increase quantity for ${productName}`}
      >
        +
      </button>
    </div>
  );
}
