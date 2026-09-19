export interface CartSummaryProps {
  items: Array<{ price: number; quantity: number }>;
  currency?: string;
}

export function CartSummary({ items, currency = 'USD' }: CartSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div
      aria-label="Cart summary"
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        background: '#f9fafb',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>Order Summary</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
        <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
        <span style={{ fontWeight: 600 }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(subtotal)}
        </span>
      </div>
    </div>
  );
}
