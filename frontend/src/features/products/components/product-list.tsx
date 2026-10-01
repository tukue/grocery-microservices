import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts, searchProducts } from "../api/product-client";
import type { ProductResponse } from "../api/product.schemas";
import { ProductCard } from "./product-card";
import { ProductSearch } from "./product-search";

export function ProductList() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    const operation = query
      ? searchProducts(query, controller.signal)
      : fetchProducts(controller.signal);
    operation
      .then((data) => {
        setProducts(data);
        setState("ready");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, [query]);
  return (
    <main>
      <h1>Products</h1>
      <ProductSearch />
      {state === "loading" && <p role="status">Loading products...</p>}
      {state === "error" && (
        <p role="alert">We could not load products. Please try again.</p>
      )}
      {state === "ready" && products.length === 0 && (
        <p role="status">No products found.</p>
      )}
      {state === "ready" && products.length > 0 && (
        <section aria-label="Products">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </main>
  );
}
