import type { Product } from "../domain/product";
import { ProductImage } from "../../../shared/ui/product-image";
import { Price } from "./price";

type ProductCardProps = Readonly<{ product: Product }>;
export function ProductCard({ product }: ProductCardProps) {
  const available = product.available && (product.stockQuantity ?? 1) > 0;
  return (
    <article className="product-card">
      <ProductImage name={product.name} src={product.imageUrl} />
      <div className="product-card-body">
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <div className="product-card-bottom">
          <Price amount={product.price} currency={product.currency} />
          <span className={`badge ${available ? "" : "badge-unavailable"}`}>
            {available ? "Available" : "Unavailable"}
          </span>
        </div>
        <a className="product-link" href={`/products/${product.id}`}>
          View product
        </a>
      </div>
    </article>
  );
}
