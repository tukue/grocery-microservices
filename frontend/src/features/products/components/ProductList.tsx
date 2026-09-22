import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { CartAdapter } from "../../cart/api/cart-adapter";
import {
  fetchProducts,
  searchProducts,
  type ProductDTO,
} from "../api/product-adapter";
import { ProductCard } from "./ProductCard";

export function ProductList() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const query = params.get("q") ?? "";
  const adapter = useMemo(() => new CartAdapter(), []);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(
      () => {
        setLoading(true);
        setError(false);
        const request = query.trim()
          ? searchProducts(query.trim())
          : fetchProducts();
        request
          .then((result) => {
            if (active) setProducts(result);
          })
          .catch(() => {
            if (active) setError(true);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      query ? 300 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  function updateQuery(value: string) {
    setParams(value.trim() ? { q: value } : {});
  }

  return (
    <main>
      <h1>Products</h1>
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        onChange={(event) => updateQuery(event.target.value)}
        value={query}
      />
      {loading && <p role="status">Loading products...</p>}
      {error && (
        <p role="alert">We could not load products. Please try again.</p>
      )}
      {!loading && !error && products.length === 0 && (
        <p role="status">No products found.</p>
      )}
      {!loading && !error && products.length > 0 && (
        <section aria-label="Products">
          {products.map((product) => (
            <ProductCard adapter={adapter} key={product.id} {...product} />
          ))}
        </section>
      )}
    </main>
  );
}
