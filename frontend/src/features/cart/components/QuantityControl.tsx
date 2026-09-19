import { useState, useRef } from 'react';
import { updateQuantity, QuantityValidationError } from '../api/update-quantity';
import type { CartAdapter, CartDTO } from '../api/cart-adapter';

export interface QuantityControlProps {
  cartId: number;
  itemId: number;
  initialQuantity: number;
  adapter: CartAdapter;
  onCartUpdated?: (cart: CartDTO) => void;
}

export function QuantityControl({ cartId, itemId, initialQuantity, adapter, onCartUpdated }: QuantityControlProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const persist = async (next: number) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const updated = await updateQuantity(adapter, cartId, itemId, next);
      setQuantity(next);
      onCartUpdated?.(updated);
    } catch (err) {
      setQuantity(initialQuantity);
      if (err instanceof QuantityValidationError) {
        setError(err.message);
      } else {
        const apiErr = err as { status?: number };
        if (apiErr.status === 409) {
          setError('Item no longer available');
        } else {
          setError('Failed to update quantity');
        }
      }
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) persist(quantity - 1);
  };

  const handleIncrement = () => {
    persist(quantity + 1);
  };

  return (
    <div role="group" aria-label={`Quantity for item`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={saving || quantity <= 1}
        aria-label="Decrease quantity"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          background: '#fff',
          cursor: saving || quantity <= 1 ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        -
      </button>
      <span
        aria-label={`Quantity: ${quantity}`}
        style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={saving}
        aria-label="Increase quantity"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          background: '#fff',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        +
      </button>
      {error && (
        <span role="alert" style={{ marginLeft: 8, color: '#dc2626', fontSize: 13 }}>
          {error}
        </span>
      )}
    </div>
  );
}
