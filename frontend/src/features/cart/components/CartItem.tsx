export interface CartItemProps {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export function CartItem({ productName, quantity, unitPrice, lineTotal }: CartItemProps) {
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
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '14px' }}>Qty: {quantity}</span>
        {lineTotal != null && (
          <span style={{ fontWeight: 600, fontSize: '15px' }}>
            ${lineTotal.toFixed(2)}
          </span>
        )}
      </div>
    </li>
  );
}
