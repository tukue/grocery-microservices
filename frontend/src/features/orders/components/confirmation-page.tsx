import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchOrder } from "../api/order-client";
import type { OrderResponseDto } from "../api/order.schemas";

export function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = Number(orderId);
  useEffect(() => {
    let active = true;
    if (!Number.isInteger(id) || id <= 0) {
      setError("Invalid order.");
      return;
    }
    fetchOrder(id)
      .then((value) => {
        if (active) setOrder(value);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load order",
          );
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main>
      <h1>Order Confirmed</h1>
      <p role="status">Thank you for your order!</p>
      <p>Order ID: {orderId}</p>
      {!order && !error && <p>Loading order details...</p>}
      {error && <p role="alert">{error}</p>}
      {order && (
        <>
          <p>{order.orderDate}</p>
          <p>Status: {order.status}</p>
          <ul>
            {order.orderLines.map((line) => (
              <li key={line.productId}>
                {line.productName} × {line.quantity} —{" "}
                {line.lineTotal.toFixed(2)}
              </li>
            ))}
          </ul>
          <p>Total: {order.total.toFixed(2)}</p>
        </>
      )}
      <Link to="/orders">View all orders</Link>
    </main>
  );
}
