import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProducts, ProductApiError } from "../api/product-client";
import type { Product } from "../api/product-schemas";

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listProducts();
        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ProductApiError ? err.message : "Failed to load products.");
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
  }, []);

  if (loading) {
    return (
      <main className="page">
        <h1>Products</h1>
        <p>Loading products…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <h1>Products</h1>
        <p className="error" role="alert">
          {error}
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Products</h1>
      {products.length === 0 ? (
        <p>No products available yet.</p>
      ) : (
        <ul className="product-grid">
          {products.map((product) => (
            <li key={product.id ?? product.name} className="product-card">
              <Link to={product.id !== null ? `/products/${product.id}` : "/products"}>
                <strong>{product.name}</strong>
              </Link>
              <span>${product.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
