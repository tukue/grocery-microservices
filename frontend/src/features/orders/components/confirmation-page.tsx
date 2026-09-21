import { useParams } from "react-router-dom";

export function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <main>
      <h1>Order Confirmed</h1>
      <p role="status">Thank you for your order!</p>
      <p>Order ID: {orderId}</p>
    </main>
  );
}
