import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart } from "../../cart/components/cart-context";
import { getProduct, ProductApiError } from "../api/product-client";
import type { Product } from "../api/product-schemas";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem, pendingItemId, isMutating } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const productId = Number(id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isInteger(productId) || productId <= 0) {
        setLoadError("Invalid product id.");
        setLoading(false);
        return;
      }
      try {
        const data = await getProduct(productId);
        if (!cancelled) {
          setProduct(data);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ProductApiError ? err.message : "Failed to load product.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleAddToCart() {
    if (!product) {
      return;
    }
    setIsAdding(true);
    setMessage(null);
    try {
      await addItem({ productName: product.name, price: product.price, quantity: 1 });
      setMessage("Added to cart");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add item to cart.");
    } finally {
      setIsAdding(false);
    }
  }

  const isSuccess = message === "Added to cart";
  const isError = message !== null && !isSuccess;
  const adding = isAdding || isMutating || pendingItemId !== null;

  if (loading) {
    return (
      <main className="page">
        <p>Loading product…</p>
      </main>
    );
  }

  if (loadError || !product) {
    return (
      <main className="page">
        <Link to="/products">← Back to products</Link>
        <p className="error" role="alert">
          {loadError ?? "Product not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <Link to="/products">← Back to products</Link>
      <h1>{product.name}</h1>
      <p className="price" data-testid="product-price">
        ${product.price.toFixed(2)}
      </p>
      <button type="button" onClick={handleAddToCart} disabled={adding} className="btn btn-primary">
        {adding ? "Adding…" : isSuccess ? "Added!" : "Add to Cart"}
      </button>
      {isError ? (
        <p className="error" role="alert">
          {message}
        </p>
      ) : isSuccess ? (
        <p role="status">
          {message} · <Link to="/cart">View cart</Link>
        </p>
      ) : null}
    </main>
  );
}
