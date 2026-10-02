import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export function productsSearchPath(search: string): string {
  const normalized = search.trim();
  return normalized
    ? `/products?q=${encodeURIComponent(normalized)}`
    : "/products";
}

export function ProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialSearch);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = search.trim();
      setSearchParams(normalized ? { q: normalized } : {}, { replace: true });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, setSearchParams]);

  function clearSearch() {
    setSearch("");
    setSearchParams({}, { replace: true });
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      <label className="sr-only" htmlFor="product-search">
        Search products
      </label>
      <input
        className="min-w-0 flex-1 border border-zinc-300 px-3 py-2"
        id="product-search"
        name="search"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products"
        type="search"
        value={search}
      />
      {initialSearch ? (
        <button
          className="border border-zinc-300 px-4 py-2"
          onClick={clearSearch}
          type="button"
        >
          Clear search
        </button>
      ) : null}
    </form>
  );
}
