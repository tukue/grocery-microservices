import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OrderError } from "../api/order-adapter";
import { fetchOrders } from "../api/order-client";
import type { Order } from "../domain/order";

function errorMessage(error: unknown): string {
  if (error instanceof OrderError) {
    if (error.status === 401 || error.status === 403) {
      return "You do not have permission to view these orders.";
    }
    return "Unable to load orders. Please try again.";
  }
  return "Unable to load orders. Please try again.";
}

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
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
  }, []);

  if (loading) {
    return (
      <main>
        <h1>Order History</h1>
        <div role="status">Loading orders...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>Order History</h1>
        <div role="alert">{error}</div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main>
        <h1>Order History</h1>
        <p>You have not placed any orders yet.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Order History</h1>
      <table>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Date</th>
            <th scope="col">Status</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/confirmation/${order.id}`)}
            >
              <td>{order.id}</td>
              <td>{order.orderDate}</td>
              <td>{order.status}</td>
              <td>{order.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
