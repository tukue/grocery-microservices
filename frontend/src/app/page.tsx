import { Storefront } from "@/features/orders";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { ProductSearch } from "@/features/products/components/product-search";
import { ProductGrid } from "@/features/products/components/product-grid";
import { createProductsApi } from "@/features/products/api/products-api";
import { useIntersectionObserver } from "@/shared/hooks/use-intersection-observer";

export default function Home() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { params, setSearchParams } = useSearchParams();

  const initialSearch = params.get("search") ?? "";
  setSearch(initialSearch);

  const productsApi = createProductsApi(
    createServerHttpClient({
      baseUrl: "/api",
      timeoutMs: 10_000,
    }),
  );

  async function loadProducts(searchTerm?: string) {
    setLoading(true);
    try {
      const result = await productsApi.list(searchTerm);
      setProducts(result);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useIntersectionObserver(
    ".product-grid",
    (isIntersecting) => {
      if (isIntersecting && products.length === 0 && !search) {
        loadProducts();
      }
    },
    { rootMargin: "200px" },
  );

  async function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    setSearch(target.value);
    await loadProducts(target.value || undefined);
    setSearchParams({ search: target.value || undefined });
  }

  function handleClearSearch() {
    setSearch("");
    setProducts([]);
    setSearchParams({});
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-zinc-900">
              Ecommerce Store
            </h1>
            <ProductSearch
              value={search}
              onChange={handleSearch}
              onClear={handleClearSearch}
            />
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="animate-pulse rounded bg-zinc-100 h-64 w-full mb-6">
            Loading products...
          </div>
        ) : products.length === 0 ? search ? (
          <p className="text-zinc-500 text-sm text-center">
            No products found matching "{search}"
          </p>
        ) : (
          <p className="text-zinc-500 text-sm text-center">
            Welcome! Start searching for products.
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </main>
  );
}