import type { CartAdapter, CartDTO } from '../../cart/api/cart-adapter';
import { AddToCartButton } from '../../cart/components/AddToCartButton';

export interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  available: boolean;
  imageUrl?: string;
  adapter: CartAdapter;
  onCartUpdated?: (cart: CartDTO) => void;
}

export function ProductCard({ id, name, price, available, imageUrl, adapter, onCartUpdated }: ProductCardProps) {
  return (
    <article
      aria-label={`Product: ${name}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
        />
      )}
      <h3 style={{ margin: 0, fontSize: '16px' }}>{name}</h3>
      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
        ${price.toFixed(2)}
      </p>
      <AddToCartButton
        productId={id}
        available={available}
        adapter={adapter}
        onCartUpdated={onCartUpdated}
      />
    </article>
  );
}
