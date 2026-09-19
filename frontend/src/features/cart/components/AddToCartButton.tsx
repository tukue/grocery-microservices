import { useState, useRef } from 'react';
import type { CartAdapter, CartDTO } from '../api/cart-adapter';

export interface AddToCartButtonProps {
  productId: number;
  available: boolean;
  adapter: CartAdapter;
  onCartUpdated?: (cart: CartDTO) => void;
}

export function AddToCartButton({ productId, available, adapter, onCartUpdated }: AddToCartButtonProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const disabled = !available || status === 'submitting';

  const handleClick = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus('submitting');
    setErrorMessage(null);

    try {
      let cart = await adapter.getCurrentCart();
      if (!cart) {
        cart = await adapter.createCart();
      }
      const updated = await adapter.addItem(cart.id, productId, 1);
      setStatus('success');
      onCartUpdated?.(updated);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 409) {
        setErrorMessage('Item unavailable or out of stock');
      } else if (apiErr.status === 400) {
        setErrorMessage('Invalid request');
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
      setStatus('error');
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-busy={status === 'submitting'}
        aria-live="polite"
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          background: !available ? '#6b7280' : status === 'submitting' ? '#93c5fd' : '#2563eb',
          color: '#fff',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: '14px',
        }}
      >
        {!available ? 'Unavailable' : status === 'submitting' ? 'Adding...' : 'Add to Cart'}
      </button>
      {status === 'success' && (
        <span role="status" style={{ marginLeft: 8, color: '#16a34a', fontSize: 13 }}>
          Added!
        </span>
      )}
      {status === 'error' && errorMessage && (
        <span role="alert" style={{ marginLeft: 8, color: '#dc2626', fontSize: 13 }}>
          {errorMessage}
        </span>
      )}
    </div>
  );
}
