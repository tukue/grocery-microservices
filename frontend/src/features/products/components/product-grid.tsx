import type { Product } from "../domain/product";
import { ProductCard } from "./product-card";

type ProductGridProps = Readonly<{
  currency?: string;
  products: readonly Product[];
}>;

export function ProductGrid({ currency, products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="border border-dashed border-zinc-300 p-8 text-center text-zinc-600" role="status">
        No products match your search.
      </p>
    );
  }

  return (
    <section aria-label="Products" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard currency={currency} key={product.id} product={product} />
      ))}
    </section>
  );
}
