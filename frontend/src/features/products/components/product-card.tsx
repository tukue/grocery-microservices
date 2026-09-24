import type { CartAdapter, CartDTO } from "../../cart/api/cart-adapter";
import { AddToCartButton } from "../../cart/components/add-to-cart-button";
import type { Product } from "../domain/product";
import { Price } from "./price";

type ProductCardProps = Readonly<{
  product: Product;
  adapter?: CartAdapter;
  onCartUpdated?: (cart: CartDTO) => void;
}>;

export function ProductCard({
  product,
  adapter,
  onCartUpdated,
}: ProductCardProps) {
  return (
    <article className="flex min-h-72 flex-col gap-3 border border-zinc-200 bg-white p-4 shadow-sm">
      {product.imageUrl ? (
        <img
          alt={product.name}
          className="h-40 w-full object-cover"
          src={product.imageUrl}
        />
      ) : (
        <div
          aria-label={`No image available for ${product.name}`}
          className="flex h-40 items-center justify-center bg-zinc-100 text-sm text-zinc-600"
          role="img"
        >
          No image available
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-950">{product.name}</h2>
        <p className="text-sm text-zinc-600">{product.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <Price amount={product.price} currency={product.currency} />
          <span
            className={product.available ? "text-emerald-700" : "text-rose-700"}
          >
            {product.available ? "Available" : "Unavailable"}
          </span>
        </div>
        {adapter && (
          <AddToCartButton
            adapter={adapter}
            available={product.available}
            onCartUpdated={onCartUpdated}
            productId={product.id}
          />
        )}
      </div>
    </article>
  );
}
