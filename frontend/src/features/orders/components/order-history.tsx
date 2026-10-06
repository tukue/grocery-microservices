import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrders, OrderClientError } from "../api/order-client";
import { toOrder } from "../api/order.mappers";
import type { Order } from "../domain/order";

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [unauthorized, setUnauthorized] = useState(false);
  useEffect(() => {
    setState("loading");
    setUnauthorized(false);
    let active = true;
    fetchOrders()
      .then((data) => {
        if (active) {
          setOrders(
            data
              .map(toOrder)
              .sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
          );
          setState("ready");
        }
      })
      .catch((cause) => {
        if (active)
          setUnauthorized(
            cause instanceof OrderClientError && cause.status === 401,
          );
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [retry]);
  if (state === "loading")
    return (
      <main>
        <p role="status">Loading orders...</p>
      </main>
    );
  if (state === "error")
    return (
      <main>
        <h1>Order History</h1>
        <p role="alert">
          {unauthorized
            ? "Your session has expired. Please sign in again."
            : "Unable to load order history."}
        </p>
        {unauthorized ? (
          <Link to="/login" state={{ from: "/orders" }}>
            Sign in again
          </Link>
        ) : (
          <button onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        )}
      </main>
    );
  if (orders.length === 0)
    return (
      <main>
        <h1>Order History</h1>
        <div className="state-panel">
          <h2>No previous orders</h2>
          <p>You have no orders yet.</p>
          <Link className="button" to="/products">
            Browse products
          </Link>
        </div>
      </main>
    );
  return (
    <main>
      <div className="page-title">
        <p className="eyebrow">YOUR GROVE ACCOUNT</p>
        <h1>Order History</h1>
        <p>View your previous orders and purchase details.</p>
      </div>
      <div className="table-scroll">
        <table className="order-table">
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
                <td>
                  <time dateTime={order.orderDate}>
                    {new Date(order.orderDate).toLocaleString()}
                  </time>
                </td>
                <td>
                  <span className="badge">{order.status}</span>
                </td>
                <td>{order.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
