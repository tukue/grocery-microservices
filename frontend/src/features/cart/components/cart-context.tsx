import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { useSession } from "../../auth/components/auth-context";
import { CartAdapter } from "../api/cart-adapter";
import type { CartDTO } from "../api/cart-adapter";

export interface CartContextValue {
  readonly adapter: CartAdapter;
  readonly cart: CartDTO | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly itemCount: number;
  readonly refresh: () => Promise<void>;
  readonly updateItem: (itemId: number, quantity: number) => Promise<CartDTO>;
  readonly removeItem: (itemId: number) => Promise<CartDTO>;
}

const CartContext = createContext<CartContextValue | null>(null);

interface CartProviderProps {
  readonly children: ReactNode;
  readonly adapter?: CartAdapter;
}

export function CartProvider({
  children,
  adapter: adapterProp,
}: CartProviderProps) {
  const { session, loading: sessionLoading } = useSession();
  const adapter = useMemo(
    () => adapterProp ?? new CartAdapter(),
    [adapterProp],
  );
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (sessionLoading) return;
    if (!session) {
      if (mountedRef.current) {
        setCart(null);
        setError(null);
        setLoading(false);
      }
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const current = await adapter.getCurrentCart();
      if (mountedRef.current) {
        // getCurrentCart resolves null (404) when the customer has no cart yet.
        setCart(current);
      }
    } catch {
      if (mountedRef.current) {
        setError("Failed to load cart");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [adapter, session, sessionLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateItem = useCallback(
    async (itemId: number, quantity: number): Promise<CartDTO> => {
      if (!cart) throw new Error("No cart loaded.");
      const previous = cart;
      setCart({
        ...cart,
        items: cart.items
          .map((item) => (item.id === itemId ? { ...item, quantity } : item))
          .filter((item) => item.quantity > 0),
      });
      try {
        const authoritative = await adapter.updateItemQuantity(
          cart.id,
          itemId,
          quantity,
        );
        if (mountedRef.current) {
          setCart(authoritative);
        }
        return authoritative;
      } catch (error) {
        if (mountedRef.current) {
          setCart(previous);
        }
        throw error;
      }
    },
    [adapter, cart],
  );

  const removeItem = useCallback(
    async (itemId: number): Promise<CartDTO> => {
      if (!cart) throw new Error("No cart loaded.");
      const previous = cart;
      setCart({
        ...cart,
        items: cart.items.filter((item) => item.id !== itemId),
      });
      try {
        const authoritative = await adapter.removeItem(cart.id, itemId);
        if (mountedRef.current) {
          setCart(authoritative);
        }
        return authoritative;
      } catch (error) {
        if (mountedRef.current) {
          setCart(previous);
        }
        throw error;
      }
    },
    [adapter, cart],
  );

  const value = useMemo<CartContextValue>(() => {
    const itemCount =
      cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    return {
      adapter,
      cart,
      loading,
      error,
      itemCount,
      refresh,
      updateItem,
      removeItem,
    };
  }, [adapter, cart, loading, error, refresh, updateItem, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}
