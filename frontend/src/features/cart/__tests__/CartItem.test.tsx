import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartItem } from '../components/CartItem';

describe('CartItem', () => {
  it('renders product name, quantity, and unit price', () => {
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
    expect(screen.getByText('$2.50 each')).toBeInTheDocument();
  });

  it('renders line total when provided', () => {
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} lineTotal={7.5} />);
    expect(screen.getByText('$7.50')).toBeInTheDocument();
  });

  it('does not render line total when not provided', () => {
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} />);
    expect(screen.queryByText('$7.50')).not.toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('aria-label', 'Apple, quantity 3');
  });

  it('formats prices correctly for single digits', () => {
    render(<CartItem productName="Banana" quantity={1} unitPrice={0.99} lineTotal={0.99} />);
    expect(screen.getByText('$0.99 each')).toBeInTheDocument();
    expect(screen.getByText('$0.99')).toBeInTheDocument();
  });
});
