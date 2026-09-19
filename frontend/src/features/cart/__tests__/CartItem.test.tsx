import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartItem } from '../components/CartItem';
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

describe('CartItem', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders product name, quantity, and unit price', () => {
    const adapter = createMockAdapter();
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

  it('does not show remove button when no adapter provided', () => {
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} />);
    expect(screen.queryByRole('button', { name: /remove apple/i })).not.toBeInTheDocument();
  });

  it('shows remove button when adapter and ids provided', () => {
    const adapter = createMockAdapter();
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} cartId={1} itemId={10} adapter={adapter} />);
    expect(screen.getByRole('button', { name: /remove apple/i })).toBeInTheDocument();
  });

  it('calls removeCartItem and onRemoved on successful remove', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({ removeItem: vi.fn().mockResolvedValue(mockCart) });
    const onRemoved = vi.fn();
    render(
      <CartItem
        productName="Apple"
        quantity={3}
        unitPrice={2.5}
        cartId={1}
        itemId={10}
        adapter={adapter}
        onRemoved={onRemoved}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove apple/i }));
    await waitFor(() => {
      expect(adapter.removeItem).toHaveBeenCalledWith(1, 10);
      expect(onRemoved).toHaveBeenCalledWith(mockCart);
    });
  });

  it('disables remove button while removing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolve: (v: CartDTO) => void;
    const adapter = createMockAdapter({
      removeItem: vi.fn().mockImplementation(() => new Promise<CartDTO>((r) => { resolve = r; })),
    });
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} cartId={1} itemId={10} adapter={adapter} />);
    const button = screen.getByRole('button', { name: /remove apple/i });

    await user.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/removing/i);

    resolve!(mockCart);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('prevents duplicate remove requests', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      removeItem: vi.fn().mockImplementation(() => new Promise<CartDTO>((r) => setTimeout(() => r(mockCart), 100))),
    });
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} cartId={1} itemId={10} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /remove apple/i }));
    await user.click(screen.getByRole('button', { name: /remove apple/i }));

    await waitFor(() => {
      expect(adapter.removeItem).toHaveBeenCalledOnce();
    });
  });

  it('shows error feedback on remove failure', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      removeItem: vi.fn().mockRejectedValue({ status: 500 }),
    });
    render(<CartItem productName="Apple" quantity={3} unitPrice={2.5} cartId={1} itemId={10} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /remove apple/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to remove item/i);
    });
  });
});
