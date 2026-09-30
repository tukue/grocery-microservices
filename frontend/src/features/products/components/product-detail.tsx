import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useCart } from "../../cart/components/cart-context";
import { fetchProduct } from "../api/product-client";
import type { ProductResponse } from "../api/product.schemas";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, pendingItems } = useCart();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productId = Number(id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!Number.isInteger(productId) || productId <= 0) {
        setError("Invalid product.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchProduct(productId);
        if (!cancelled) {
          setProduct(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load product",
          );
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

  if (loading) {
    return (
      <main>
        <div role="status">Loading product...</div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main>
        <Link to="/products">Back to products</Link>
        <div role="alert">{error ?? "Product not found."}</div>
      </main>
    );
  }

  const purchasable = product.available && (product.stockQuantity ?? 1) > 0;

  return (
    <main>
      <Link to="/products">Back to products</Link>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p data-testid="product-price">
        {new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: product.currency,
        }).format(product.price)}
      </p>
      <p>
        {(product.stockQuantity ?? 1) > 0
          ? `${product.stockQuantity} in stock`
          : "Out of stock"}
      </p>
      {purchasable ? (
        <button
          disabled={pendingItems.has(product.id)}
          onClick={() => void addItem(product.id, 1)}
        >
          {pendingItems.has(product.id) ? "Adding..." : "Add to Cart"}
        </button>
      ) : (
        <button type="button" disabled>
          Unavailable
        </button>
      )}
      <div style={{ marginTop: "16px" }}>
        <Link to="/cart">View cart</Link>
      </div>
    </main>
  );
}
