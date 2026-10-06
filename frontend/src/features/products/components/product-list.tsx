import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts, searchProducts } from "../api/product-client";
import type { Product } from "../domain/product";
import { toProduct } from "../api/product.mapper";
import { ProductCard } from "./product-card";
import { ProductSearch } from "./product-search";

export function ProductList() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState("name");
  const [availableOnly, setAvailableOnly] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    const operation = query
      ? searchProducts(query, controller.signal)
      : fetchProducts(controller.signal);
    operation
      .then((data) => {
        if (controller.signal.aborted) return;
        setProducts(data.map(toProduct));
        setState("ready");
      })
      .catch((error) => {
        if (!controller.signal.aborted && error?.name !== "AbortError")
          setState("error");
      });
    return () => controller.abort();
  }, [query, retry]);
  const mixedCurrencies =
    new Set(products.map((product) => product.currency)).size > 1;
  const visible = products
    .filter(
      (product) =>
        !availableOnly ||
        (product.available && (product.stockQuantity ?? 1) > 0),
    )
    .sort((a, b) =>
      !mixedCurrencies && sort === "price-low"
        ? a.price - b.price
        : !mixedCurrencies && sort === "price-high"
          ? b.price - a.price
          : a.name.localeCompare(b.name),
    );
  return (
    <main>
      {!query && (
        <section className="hero-banner" aria-label="Welcome to Grove">
          <div className="hero-copy">
            <p className="eyebrow">GROCERY SHOPPING</p>
            <h2>
              Browse groceries.
              <br />
              Shop with confidence.
            </h2>
            <p>Browse available products and select the items you need.</p>
            <a className="button" href="#catalog">
              Explore the shop <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <svg viewBox="0 0 360 280">
              <ellipse cx="180" cy="250" rx="100" ry="12" fill="#b9c5a1" />
              <path d="M104 139h158l-21 107H128Z" fill="#af8155" />
              <path
                d="M133 144c0-96 103-96 103 0"
                fill="none"
                stroke="#89603d"
                strokeWidth="9"
              />
              <path
                d="M157 153c-23-23-23-70 5-94 35 22 29 71-5 94Z"
                fill="#3a7446"
              />
              <path
                d="M172 151c-5-37 17-74 50-70 6 43-17 63-50 70Z"
                fill="#71955c"
              />
              <ellipse cx="216" cy="137" rx="29" ry="26" fill="#c16b42" />
              <path d="m211 106 8-14" stroke="#426d38" strokeWidth="7" />
              <ellipse cx="136" cy="143" rx="24" ry="23" fill="#dda840" />
              <path
                d="M148 176h96M143 196h96M137 216h98"
                stroke="#cba67f"
                strokeWidth="5"
              />
            </svg>
            <span className="hero-tag">SELECT PRODUCTS FOR YOUR CART</span>
          </div>
        </section>
      )}
      <div id="catalog" className="catalog-heading">
        <div>
          <p className="eyebrow">THE GROVE SHOP</p>
          <h1>Products</h1>
          <p className="muted">
            {query
              ? `Results for “${query}”`
              : "Browse products, prices, and availability."}
          </p>
        </div>
        {state === "ready" && (
          <p className="muted">
            {visible.length} {visible.length === 1 ? "product" : "products"}
          </p>
        )}
      </div>
      <div className="catalog-toolbar">
        <ProductSearch />
        <div className="catalog-controls">
          <label>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
            />
            In stock only
          </label>
          <label>
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="name">Name</option>
              <option disabled={mixedCurrencies} value="price-low">
                Price: low to high
              </option>
              <option disabled={mixedCurrencies} value="price-high">
                Price: high to low
              </option>
            </select>
          </label>
        </div>
      </div>
      {state === "loading" && (
        <>
          <p role="status">Loading products...</p>
          <div className="loading-grid" aria-hidden="true">
            {[1, 2, 3, 4].map((id) => (
              <div className="skeleton" key={id} />
            ))}
          </div>
        </>
      )}
      {state === "error" && (
        <div className="state-panel">
          <p role="alert">We could not load products. Please try again.</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}
      {state === "ready" && visible.length === 0 && (
        <div className="state-panel">
          <h2>Nothing here just yet</h2>
          <p role="status">No products found.</p>
          <p>Try another search or turn off the stock filter.</p>
        </div>
      )}
      {state === "ready" && visible.length > 0 && (
        <section className="product-grid" aria-label="Products">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
      <section className="benefit-strip" aria-label="Shopping with Grove">
        <div>
          <strong>Saved cart</strong>
          <p>Sign in to access your cart across visits.</p>
        </div>
        <div>
          <strong>Product pricing</strong>
          <p>Review your cart before placing an order.</p>
        </div>
        <div>
          <strong>Order records</strong>
          <p>Access your order history and purchase details.</p>
        </div>
      </section>
    </main>
  );
}
