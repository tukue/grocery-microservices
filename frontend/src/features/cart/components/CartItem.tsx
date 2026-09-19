import { useState, useRef } from 'react';
import { removeCartItem } from '../api/remove-item';
import type { CartAdapter, CartDTO } from '../api/cart-adapter';

export interface CartItemProps {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  cartId?: number;
  itemId?: number;
  adapter?: CartAdapter;
  onRemoved?: (cart: CartDTO) => void;
}

export function CartItem({ productName, quantity, unitPrice, lineTotal, cartId, itemId, adapter, onRemoved }: CartItemProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const canRemove = adapter != null && cartId != null && itemId != null;

  const handleRemove = async () => {
    if (!canRemove || submittingRef.current) return;
    submittingRef.current = true;
    setRemoving(true);
    setError(null);

    try {
      const updated = await removeCartItem(adapter, cartId, itemId);
      onRemoved?.(updated);
    } catch {
      setError('Failed to remove item');
    } finally {
      submittingRef.current = false;
      setRemoving(false);
    }
  };

  return (
    <li
      aria-label={`${productName}, quantity ${quantity}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>{productName}</span>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          ${unitPrice.toFixed(2)} each
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '14px' }}>Qty: {quantity}</span>
          {lineTotal != null && (
            <span style={{ fontWeight: 600, fontSize: '15px' }}>
              ${lineTotal.toFixed(2)}
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            aria-label={`Remove ${productName}`}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 600,
              cursor: removing ? 'not-allowed' : 'pointer',
              opacity: removing ? 0.6 : 1,
            }}
          >
            {removing ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>
      {error && (
        <span role="alert" style={{ marginLeft: 8, color: '#dc2626', fontSize: 13 }}>
          {error}
        </span>
      )}
    </li>
  );
}
