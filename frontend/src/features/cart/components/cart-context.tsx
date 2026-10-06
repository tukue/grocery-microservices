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

import { useSession } from "../../auth";
import { CartAdapter } from "../api/cart-adapter";
import type { CartDTO } from "../api/cart-adapter";
import { toCart } from "../api/cart.mapper";
import type { Cart } from "../domain/cart";
import { CartClient } from "../api/cart-client";

type CartPort = Pick<
  CartAdapter,
  | "getCurrentCart"
  | "createCart"
  | "addItem"
  | "updateItemQuantity"
  | "removeItem"
>;

export interface CartContextValue {
  readonly adapter: CartPort;
  readonly cart: Cart | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly itemCount: number;
  readonly pendingItems: ReadonlySet<number>;
  readonly addItem: (productId: number, quantity?: number) => Promise<CartDTO>;
  readonly clear: () => void;
  readonly refresh: () => Promise<void>;
  readonly updateItem: (itemId: number, quantity: number) => Promise<CartDTO>;
  readonly removeItem: (itemId: number) => Promise<CartDTO>;
}

const CartContext = createContext<CartContextValue | null>(null);

interface CartProviderProps {
  readonly children: ReactNode;
  readonly adapter?: CartPort;
}

export function CartProvider({
  children,
  adapter: adapterProp,
}: CartProviderProps) {
  const { session, loading: sessionLoading } = useSession();
  const adapter = useMemo(() => adapterProp ?? new CartClient(), [adapterProp]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const mountedRef = useRef(true);
  const mutationLock = useRef(false);
  const sessionRef = useRef(session?.userId);
  sessionRef.current = session?.userId;
  const refreshId = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++refreshId.current;
    const owner = session?.userId;
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
        if (requestId === refreshId.current && sessionRef.current === owner)
          setCart(current ? toCart(current) : null);
      }
    } catch {
      if (mountedRef.current) {
        if (requestId === refreshId.current && sessionRef.current === owner)
          setError("Failed to load cart");
      }
    } finally {
      if (mountedRef.current) {
        if (requestId === refreshId.current && sessionRef.current === owner)
          setLoading(false);
      }
    }
  }, [adapter, session, sessionLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: number, quantity = 1): Promise<CartDTO> => {
      if (loading) throw new Error("Your cart is still loading.");
      if (!sessionRef.current) throw new Error("Please sign in to continue.");
      if (mutationLock.current)
        throw new Error("Your cart is updating. Please try again.");
      mutationLock.current = true;
      const owner = sessionRef.current;
      setPendingItems((current) => new Set(current).add(productId));
      setError(null);
      try {
        const current = cart ?? (await adapter.createCart());
        const authoritative = await adapter.addItem(
          current.id,
          productId,
          quantity,
        );
        if (mountedRef.current && sessionRef.current === owner)
          setCart(toCart(authoritative));
        return authoritative;
      } catch (cause) {
        if (mountedRef.current && sessionRef.current === owner)
          setError("Failed to add item");
        throw cause;
      } finally {
        mutationLock.current = false;
        setPendingItems((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [adapter, cart, loading],
  );

  const updateItem = useCallback(
    async (itemId: number, quantity: number): Promise<CartDTO> => {
      if (!cart) throw new Error("No cart loaded.");
      if (mutationLock.current)
        throw new Error("Your cart is updating. Please try again.");
      mutationLock.current = true;
      const owner = sessionRef.current;
      setPendingItems((current) => new Set(current).add(itemId));
      setError(null);
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
          if (sessionRef.current === owner) setCart(toCart(authoritative));
        }
        return authoritative;
      } catch (error) {
        if (mountedRef.current) {
          if (sessionRef.current === owner) {
            setCart(previous);
            setError("Could not update your cart. Please try again.");
          }
        }
        throw error;
      } finally {
        mutationLock.current = false;
        setPendingItems((current) => {
          const next = new Set(current);
          next.delete(itemId);
          return next;
        });
      }
    },
    [adapter, cart],
  );

  const removeItem = useCallback(
    async (itemId: number): Promise<CartDTO> => {
      if (!cart) throw new Error("No cart loaded.");
      if (mutationLock.current)
        throw new Error("Your cart is updating. Please try again.");
      mutationLock.current = true;
      const owner = sessionRef.current;
      setPendingItems((current) => new Set(current).add(itemId));
      setError(null);
      const previous = cart;
      setCart({
        ...cart,
        items: cart.items.filter((item) => item.id !== itemId),
      });
      try {
        const authoritative = await adapter.removeItem(cart.id, itemId);
        if (mountedRef.current) {
          if (sessionRef.current === owner) setCart(toCart(authoritative));
        }
        return authoritative;
      } catch (error) {
        if (mountedRef.current) {
          if (sessionRef.current === owner) {
            setCart(previous);
            setError("Could not update your cart. Please try again.");
          }
        }
        throw error;
      } finally {
        mutationLock.current = false;
        setPendingItems((current) => {
          const next = new Set(current);
          next.delete(itemId);
          return next;
        });
      }
    },
    [adapter, cart],
  );

  const value = useMemo<CartContextValue>(() => {
    const itemCount =
      cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    return {
      adapter,
      addItem,
      cart,
      clear: () => setCart(null),
      loading,
      error,
      itemCount,
      pendingItems,
      refresh,
      updateItem,
      removeItem,
    };
  }, [
    adapter,
    addItem,
    cart,
    loading,
    error,
    pendingItems,
    refresh,
    updateItem,
    removeItem,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}
