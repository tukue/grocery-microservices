import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../auth/components/auth-context";
import { withOptimisticQuantity } from "../api/cart-adapter";
import { CartApiError } from "../api/cart-api";
import {
  addItem as clientAddItem,
  getOrCreateCart,
  removeItem as clientRemoveItem,
  updateItem as clientUpdateItem,
  type Cart,
} from "../api/cart-client";
import type { NewCartItem } from "../api/cart-api";

const EMPTY_CART: Cart = { id: null, items: [], total: 0, itemCount: 0 };

type CartContextValue = {
  cart: Cart;
  loading: boolean;
  error: string | null;
  pendingItemId: number | null;
  isMutating: boolean;
  addItem: (item: NewCartItem) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof CartApiError) {
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      if (mountedRef.current) {
        setCart(EMPTY_CART);
        setLoading(false);
      }
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const fresh = await getOrCreateCart();
      if (mountedRef.current) {
        setCart(fresh);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(toMessage(err, "Failed to load cart."));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async (itemId: number | null, optimisticQuantity: number | null, operation: () => Promise<Cart>) => {
      if (cart.id === null) {
        // No cart yet (e.g. logged in with cleared storage) — create one first.
        await refresh();
      }
      const previous = cart;
      setError(null);
      setPendingItemId(itemId);
      setIsMutating(true);

      if (itemId !== null && optimisticQuantity !== null) {
        setCart((current) => withOptimisticQuantity(current, itemId, optimisticQuantity));
      }

      try {
        const authoritative = await operation();
        if (mountedRef.current) {
          setCart(authoritative);
        }
      } catch (err) {
        if (mountedRef.current) {
          // Revert the optimistic update so UI matches server truth.
          setCart(previous);
          setError(toMessage(err, "Failed to update cart."));
        }
        throw err instanceof Error ? err : new Error(toMessage(err, "Failed to update cart."));
      } finally {
        if (mountedRef.current) {
          setPendingItemId(null);
          setIsMutating(false);
        }
      }
    },
    [cart, refresh],
  );

  const addItem = useCallback(
    async (item: NewCartItem) => {
      const cartId = cart.id ?? (await getOrCreateCart()).id;
      if (cartId === null || cartId === undefined) {
        throw new Error("Could not resolve a cart.");
      }
      await runMutation(null, null, () => clientAddItem(cartId, item));
    },
    [cart.id, runMutation],
  );

  const updateItem = useCallback(
    (itemId: number, quantity: number) => {
      const cartId = cart.id;
      if (cartId === null) {
        return Promise.reject(new Error("No cart yet."));
      }
      return runMutation(itemId, quantity, () => clientUpdateItem(cartId, itemId, quantity));
    },
    [cart.id, runMutation],
  );

  const removeItem = useCallback(
    (itemId: number) => {
      const cartId = cart.id;
      if (cartId === null) {
        return Promise.reject(new Error("No cart yet."));
      }
      return runMutation(itemId, null, () => clientRemoveItem(cartId, itemId));
    },
    [cart.id, runMutation],
  );

  const value = useMemo<CartContextValue>(
    () => ({ cart, loading, error, pendingItemId, isMutating, addItem, updateItem, removeItem, refresh }),
    [cart, loading, error, pendingItemId, isMutating, addItem, updateItem, removeItem, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return context;
}
