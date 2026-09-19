import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuantityControl } from '../components/QuantityControl';
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

describe('QuantityControl', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('displays initial quantity', () => {
    const adapter = createMockAdapter();
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} />);
    expect(screen.getByLabelText('Quantity: 3')).toBeInTheDocument();
  });

  it('increments quantity on + click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({ updateItemQuantity: vi.fn().mockResolvedValue(mockCart) });
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await waitFor(() => {
      expect(adapter.updateItemQuantity).toHaveBeenCalledWith(1, 10, 4);
      expect(screen.getByLabelText('Quantity: 4')).toBeInTheDocument();
    });
  });

  it('decrements quantity on - click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({ updateItemQuantity: vi.fn().mockResolvedValue(mockCart) });
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /decrease quantity/i }));
    await waitFor(() => {
      expect(adapter.updateItemQuantity).toHaveBeenCalledWith(1, 10, 2);
      expect(screen.getByLabelText('Quantity: 2')).toBeInTheDocument();
    });
  });

  it('disables decrement at quantity 1', () => {
    const adapter = createMockAdapter();
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={1} adapter={adapter} />);
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
  });

  it('disables controls while saving', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolve: (v: CartDTO) => void;
    const adapter = createMockAdapter({
      updateItemQuantity: vi.fn().mockImplementation(() => new Promise<CartDTO>((r) => { resolve = r; })),
    });
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();

    resolve!(mockCart);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /increase quantity/i })).not.toBeDisabled();
    });
  });

  it('restores authoritative quantity after failure', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      updateItemQuantity: vi.fn().mockRejectedValue({ status: 500 }),
    });
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await waitFor(() => {
      expect(screen.getByLabelText('Quantity: 3')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to update quantity/i);
    });
  });

  it('shows validation error for 409 conflict', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      updateItemQuantity: vi.fn().mockRejectedValue({ status: 409 }),
    });
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no longer available/i);
    });
  });

  it('calls onCartUpdated on success', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({ updateItemQuantity: vi.fn().mockResolvedValue(mockCart) });
    const onCartUpdated = vi.fn();
    render(<QuantityControl cartId={1} itemId={10} initialQuantity={3} adapter={adapter} onCartUpdated={onCartUpdated} />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await waitFor(() => {
      expect(onCartUpdated).toHaveBeenCalledWith(mockCart);
    });
  });
});
