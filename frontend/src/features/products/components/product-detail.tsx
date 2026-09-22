import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AddToCartButton } from "../../cart/components/AddToCartButton";
import { useCart } from "../../cart/components/cart-context";
import { fetchProduct } from "../api/product-adapter";
import type { ProductDTO } from "../api/product-adapter";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { adapter } = useCart();
  const [product, setProduct] = useState<ProductDTO | null>(null);
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

  const purchasable = product.available && product.stockQuantity > 0;

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
        {product.stockQuantity > 0
          ? `${product.stockQuantity} in stock`
          : "Out of stock"}
      </p>
      {purchasable ? (
        <AddToCartButton
          productId={product.id}
          available={product.available}
          adapter={adapter}
        />
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
