import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddToCartButton } from '../components/AddToCartButton';
import type { CartAdapter, CartDTO } from '../api/cart-adapter';

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

describe('AddToCartButton', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders Add to Cart for available products', () => {
    const adapter = createMockAdapter();
    render(<AddToCartButton productId={42} available={true} adapter={adapter} />);
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('renders Unavailable and disables for unavailable products', () => {
    const adapter = createMockAdapter();
    render(<AddToCartButton productId={42} available={false} adapter={adapter} />);
    const button = screen.getByRole('button', { name: /unavailable/i });
    expect(button).toBeDisabled();
  });

  it('calls adapter methods and shows success on click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockResolvedValue(mockCartWithItem),
    });
    const onCartUpdated = vi.fn();

    render(<AddToCartButton productId={42} available={true} adapter={adapter} onCartUpdated={onCartUpdated} />);

    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(adapter.getCurrentCart).toHaveBeenCalledOnce();
      expect(adapter.addItem).toHaveBeenCalledWith(1, 42, 1);
      expect(onCartUpdated).toHaveBeenCalledWith(mockCartWithItem);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/added!/i);
  });

  it('creates a cart when none exists', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(null),
      createCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockResolvedValue(mockCartWithItem),
    });

    render(<AddToCartButton productId={42} available={true} adapter={adapter} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(adapter.createCart).toHaveBeenCalledOnce();
      expect(adapter.addItem).toHaveBeenCalledWith(1, 42, 1);
    });
  });

  it('disables button while submitting', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolve: (v: CartDTO) => void;
    const addPromise = new Promise<CartDTO>((r) => { resolve = r; });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockReturnValue(addPromise),
    });

    render(<AddToCartButton productId={42} available={true} adapter={adapter} />);
    const button = screen.getByRole('button', { name: /add to cart/i });

    await user.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/adding/i);

    resolve!(mockCartWithItem);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('prevents duplicate submissions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockImplementation(() => new Promise<CartDTO>((r) => setTimeout(() => r(mockCartWithItem), 100))),
    });

    render(<AddToCartButton productId={42} available={true} adapter={adapter} />);
    const button = screen.getByRole('button', { name: /add to cart/i });

    await user.click(button);
    await user.click(button);

    await waitFor(() => {
      expect(adapter.addItem).toHaveBeenCalledOnce();
    });
  });

  it('shows error feedback on failure', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockRejectedValue({ status: 500, message: 'Server error' }),
    });

    render(<AddToCartButton productId={42} available={true} adapter={adapter} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    });
  });

  it('shows specific error for 409 conflict', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockRejectedValue({ status: 409, message: 'Out of stock' }),
    });

    render(<AddToCartButton productId={42} available={true} adapter={adapter} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/unavailable or out of stock/i);
    });
  });
});
