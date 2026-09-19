import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartSummary } from '../components/CartSummary';

describe('CartSummary', () => {
  it('renders order summary heading', () => {
    render(<CartSummary items={[]} />);
    expect(screen.getByRole('heading', { name: /order summary/i })).toBeInTheDocument();
  });

  it('displays subtotal with item count', () => {
    render(<CartSummary items={[{ price: 2.5, quantity: 3 }, { price: 1.0, quantity: 2 }]} />);
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
    expect(screen.getByText('$9.50')).toBeInTheDocument();
  });

  it('displays singular item count for one item', () => {
    render(<CartSummary items={[{ price: 5.0, quantity: 1 }]} />);
    expect(screen.getByText(/1 item/)).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
  });

  it('displays $0.00 for empty cart', () => {
    render(<CartSummary items={[]} />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<CartSummary items={[{ price: 12.345, quantity: 1 }]} currency="EUR" />);
    expect(screen.getByText(/€12.35/)).toBeInTheDocument();
  });
});
