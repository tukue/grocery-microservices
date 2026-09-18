"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function productsSearchPath(search: string): string {
  const normalized = search.trim();
  return normalized ? `/products?search=${encodeURIComponent(normalized)}` : "/products";
}

export function ProductSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(productsSearchPath(search));
  }

  function clearSearch() {
    setSearch("");
    router.push("/products");
  }

  return (
    <form className="flex flex-wrap gap-2" onSubmit={submit} role="search">
      <label className="sr-only" htmlFor="product-search">Search products</label>
      <input
        className="min-w-0 flex-1 border border-zinc-300 px-3 py-2"
        id="product-search"
        name="search"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products"
        type="search"
        value={search}
      />
      <button className="bg-zinc-900 px-4 py-2 text-white" type="submit">Search</button>
      {initialSearch ? (
        <button className="border border-zinc-300 px-4 py-2" onClick={clearSearch} type="button">
          Clear search
        </button>
      ) : null}
    </form>
  );
}
