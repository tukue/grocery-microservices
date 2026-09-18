"use client";

import { ProductErrorState } from "./product-error-state";

type ProductsErrorProps = Readonly<{
  reset: () => void;
}>;

export default function ProductsError({ reset }: ProductsErrorProps) {
  return <ProductErrorState onRetry={reset} />;
}
