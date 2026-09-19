import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartPage } from '../components/CartPage';
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

const mockCart: CartDTO = {
  id: 1,
  status: 'OPEN',
  items: [
    { id: 10, productId: 42, productName: 'Apple', price: 2.5, quantity: 3 },
    { id: 11, productId: 43, productName: 'Banana', price: 1.0, quantity: 2 },
  ],
};

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CartPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('shows loading state', () => {
    const adapter = createMockAdapter({ getCurrentCart: vi.fn(() => new Promise<CartDTO | null>(() => {})) });
    renderWithRouter(<CartPage adapter={adapter} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading cart/i);
  });

  it('shows empty cart state', async () => {
    const adapter = createMockAdapter({ getCurrentCart: vi.fn().mockResolvedValue(null) });
    renderWithRouter(<CartPage adapter={adapter} />);
    await waitFor(() => {
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /browse products/i })).toHaveAttribute('href', '/products');
  });

  it('renders cart items and summary', async () => {
    const adapter = createMockAdapter({ getCurrentCart: vi.fn().mockResolvedValue(mockCart) });
    renderWithRouter(<CartPage adapter={adapter} />);
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /order summary/i })).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockRejectedValue({ status: 500 }),
    });
    renderWithRouter(<CartPage adapter={adapter} />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load cart/i);
    });
  });

  it('provides link back to products', async () => {
    const adapter = createMockAdapter({ getCurrentCart: vi.fn().mockResolvedValue(mockCart) });
    renderWithRouter(<CartPage adapter={adapter} />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute('href', '/products');
    });
  });
});
