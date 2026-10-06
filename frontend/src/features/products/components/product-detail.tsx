import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../../cart";
import { useSession } from "../../auth";
import { ProductImage } from "../../../shared/ui/product-image";
import { fetchProduct } from "../api/product-client";
import { toProduct } from "../api/product.mapper";
import type { Product } from "../domain/product";
import { Price } from "./price";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, pendingItems, loading: cartLoading } = useCart();
  const { session } = useSession();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const productId = Number(id);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setProduct(null);
    setQuantity(1);
    setFeedback(undefined);
    setFailure(undefined);
    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product.");
      setLoading(false);
      return;
    }
    fetchProduct(productId)
      .then((data) => {
        if (active) setProduct(toProduct(data));
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load product",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, retry]);
  async function add() {
    if (!session) {
      navigate("/login", { state: { from: `/products/${productId}` } });
      return;
    }
    if (submitting.current || !product) return;
    submitting.current = true;
    setFeedback(undefined);
    setFailure(undefined);
    try {
      await addItem(product.id, quantity);
      setFeedback("Added to your basket.");
    } catch {
      setFailure("Could not add this item. Check availability and try again.");
    } finally {
      submitting.current = false;
    }
  }
  if (loading)
    return (
      <main>
        <p role="status">Loading product...</p>
      </main>
    );
  if (error || !product)
    return (
      <main>
        <Link className="breadcrumb" to="/products">
          Back to products
        </Link>
        <div className="state-panel">
          <p role="alert">{error ?? "Product not found."}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      </main>
    );
  const purchasable = product.available && (product.stockQuantity ?? 1) > 0;
  return (
    <main>
      <Link className="breadcrumb" to="/products">
        ← Back to products
      </Link>
      <div className="detail-layout">
        <ProductImage name={product.name} src={product.imageUrl} />
        <section className="detail-info">
          <p className="eyebrow">A GOOD THING FOR YOUR BASKET</p>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <div data-testid="product-price">
            <Price amount={product.price} currency={product.currency} />
          </div>
          <span className={`badge ${purchasable ? "" : "badge-unavailable"}`}>
            {purchasable
              ? product.stockQuantity !== undefined
                ? `${product.stockQuantity} in stock`
                : "In stock"
              : "Out of stock"}
          </span>
          <label className="quantity-field">
            Quantity
            <input
              type="number"
              min={1}
              max={product.stockQuantity ?? 99}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>
          <div className="detail-actions">
            <button
              disabled={
                !purchasable ||
                cartLoading ||
                pendingItems.size > 0 ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > (product.stockQuantity ?? 99)
              }
              onClick={() => void add()}
            >
              {pendingItems.has(product.id)
                ? "Adding..."
                : purchasable
                  ? "Add to Cart"
                  : "Unavailable"}
            </button>
            <Link to="/cart">View cart</Link>
          </div>
          {feedback && (
            <p className="inline-feedback" role="status">
              {feedback}
            </p>
          )}
          {failure && <p role="alert">{failure}</p>}
          <p className="muted">
            Your basket uses the latest product prices and availability.
          </p>
        </section>
      </div>
    </main>
  );
}
