import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { OrderError } from "../api/order-adapter";
import { fetchOrder } from "../api/order-client";
import type { Order } from "../domain/order";

function errorMessage(error: unknown): string {
  if (error instanceof OrderError) {
    if (error.status === 404 || error.status === 403) {
      return "Order not found or you do not have access to it.";
    }
    return "Unable to load order details. Please try again.";
  }
  return "Unable to load order details. Please try again.";
}

export function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(orderId);
    if (!Number.isInteger(id) || id <= 0) {
      setError("Order not found or you do not have access to it.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setOrder(null);

    fetchOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main>
        <h1>Order Confirmed</h1>
        <div role="status">Loading order...</div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main>
        <h1>Order Confirmed</h1>
        <div role="alert">{error ?? "Order not found."}</div>
        <Link to="/orders">Back to order history</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Order Confirmed</h1>
      <p role="status">Thank you for your order!</p>
      <dl>
        <div>
          <dt>Order ID</dt>
          <dd>{order.id}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{order.orderDate}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{order.status}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{order.total.toFixed(2)}</dd>
        </div>
      </dl>
      <h2>Items</h2>
      <ul aria-label="Order line items">
        {order.orderLines.map((line) => (
          <li key={line.productId}>
            {line.productName} x {line.quantity} — {line.lineTotal.toFixed(2)}
          </li>
        ))}
      </ul>
      <Link to="/orders">View order history</Link>
    </main>
  );
}
