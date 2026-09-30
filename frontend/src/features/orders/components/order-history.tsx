import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders } from "../api/order-client";
import type { OrderResponseDto } from "../api/order.schemas";

export function OrderHistory() {
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((data) => {
        if (active) {
          setOrders(
            [...data].sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
          );
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, []);
  if (state === "loading") return <p role="status">Loading orders...</p>;
  if (state === "error")
    return <p role="alert">Unable to load order history.</p>;
  if (orders.length === 0)
    return (
      <main>
        <h1>Order History</h1>
        <p>You have no orders yet.</p>
      </main>
    );
  return (
    <main>
      <h1>Order History</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link to={`/confirmation/${order.id}`}>{order.id}</Link>
              </td>
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
