import { useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setSearch(initialSearch);
    clearTimeout(timer.current);
  }, [initialSearch]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function updateSearch(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value.trim()) next.set("q", value.trim());
          else next.delete("q");
          return next;
        },
        { replace: true },
      );
    }, 300);
  }

  function clearSearch() {
    clearTimeout(timer.current);
    setSearch("");
    setSearchParams({}, { replace: true });
  }

  return (
    <form
      className="search-form"
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
        onChange={(event) => updateSearch(event.target.value)}
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
