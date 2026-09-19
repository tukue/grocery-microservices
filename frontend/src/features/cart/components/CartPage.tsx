import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CartAdapter, CartDTO } from '../api/cart-adapter';
import { CartItem } from '../components/CartItem';
import { CartSummary } from '../components/CartSummary';

export interface CartPageProps {
  adapter: CartAdapter;
}

export function CartPage({ adapter }: CartPageProps) {
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adapter
      .getCurrentCart()
      .then((c) => {
        if (!cancelled) {
          setCart(c);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load cart');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [adapter]);

  if (loading) {
    return <div role="status">Loading cart...</div>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
        <Link to="/products">Back to products</Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div>
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Browse products</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Your Cart</h1>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
        {cart.items.map((item) => (
          <CartItem
            key={item.id}
            productName={item.productName}
            quantity={item.quantity}
            unitPrice={item.price}
          />
        ))}
      </ul>
      <CartSummary items={cart.items} />
      <div style={{ marginTop: '16px' }}>
        <Link to="/products">Continue shopping</Link>
      </div>
    </div>
  );
}
