import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductCard } from '../components/ProductCard';
import type { CartAdapter, CartDTO } from '../../cart/api/cart-adapter';

function createMockAdapter(overrides: Partial<CartAdapter> = {}): CartAdapter {
  return {
    getCurrentCart: vi.fn(),
    createCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
    ...overrides,
  } as unknown as CartAdapter;
}

const mockCart: CartDTO = { id: 1, status: 'OPEN', items: [] };
const mockCartWithItem: CartDTO = { id: 1, status: 'OPEN', items: [{ id: 10, productId: 42, productName: 'Apple', price: 2.5, quantity: 1 }] };

describe('ProductCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders product name and price', () => {
    const adapter = createMockAdapter();
    render(<ProductCard id={42} name="Apple" price={2.5} available={true} adapter={adapter} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    const adapter = createMockAdapter();
    render(<ProductCard id={42} name="Apple" price={2.5} available={true} imageUrl="/apple.jpg" adapter={adapter} />);
    expect(screen.getByRole('img', { name: 'Apple' })).toHaveAttribute('src', '/apple.jpg');
  });

  it('does not render image when imageUrl is absent', () => {
    const adapter = createMockAdapter();
    render(<ProductCard id={42} name="Apple" price={2.5} available={true} adapter={adapter} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('passes only id and availability to AddToCartButton', () => {
    const adapter = createMockAdapter();
    render(<ProductCard id={42} name="Apple" price={2.5} available={false} adapter={adapter} />);
    expect(screen.getByRole('button', { name: /unavailable/i })).toBeDisabled();
  });

  it('does not place API logic in ProductCard', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockResolvedValue(mockCartWithItem),
    });
    const onCartUpdated = vi.fn();

    render(<ProductCard id={42} name="Apple" price={2.5} available={true} adapter={adapter} onCartUpdated={onCartUpdated} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(adapter.getCurrentCart).toHaveBeenCalledOnce();
      expect(adapter.addItem).toHaveBeenCalledWith(1, 42, 1);
      expect(onCartUpdated).toHaveBeenCalledWith(mockCartWithItem);
    });
  });
});
