import { ProductGrid } from "@/features/products";
import { ProductSearch } from "@/features/products/components/product-search";
import { getProducts } from "@/features/products/api/products.server";

export const dynamic = "force-dynamic";

type ProductsPageProps = Readonly<{
  searchParams: Promise<{ search?: string | string[] }>;
}>;

function firstSearchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const search = firstSearchValue((await searchParams).search)?.trim();
  const products = await getProducts(search);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Products</h1>
          <p className="mt-1 text-zinc-600">Browse the current grocery catalogue.</p>
        </div>
        <ProductSearch />
      </div>
      <ProductGrid products={products} />
    </main>
  );
}
