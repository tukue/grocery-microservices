"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  ApplicationError,
  createApplicationError,
} from "@/shared/errors/application-error";

import type { CartSummary, Order } from "../domain/order";
import { checkoutRequestSchema } from "../api/order.schemas";

type CheckoutFormValues = {
  idempotencyKey?: string;
};

type CheckoutFormProps = Readonly<{
  cart: CartSummary;
  onConfirmed(order: Order): void;
  submitOrder(input: {
    cartId: number;
    idempotencyKey?: string;
  }): Promise<Order>;
}>;

export function CheckoutForm({
  cart,
  onConfirmed,
  submitOrder,
}: CheckoutFormProps) {
  const [failureMessage, setFailureMessage] = useState<string>();
  const [submissionLocked, setSubmissionLocked] = useState(false);
  const form = useForm<CheckoutFormValues>({
    defaultValues: { idempotencyKey: "" },
    mode: "onChange",
    resolver: zodResolver(checkoutRequestSchema.omit({ cartId: true })),
  });

  async function onSubmit(values: CheckoutFormValues): Promise<void> {
    if (submissionLocked) {
      return;
    }

    setSubmissionLocked(true);
    setFailureMessage(undefined);
    try {
      const order = await submitOrder({ cartId: cart.id, ...values });
      onConfirmed(order);
    } catch (error) {
      const applicationError =
        error instanceof ApplicationError
          ? error
          : createApplicationError("unexpected");
      setFailureMessage(applicationError.customerMessage);
    } finally {
      setSubmissionLocked(false);
    }
  }

  return (
    <form aria-label="Checkout" onSubmit={form.handleSubmit(onSubmit)}>
      <h2>Checkout</h2>
      <p>Cart total: {cart.total.toFixed(2)}</p>
      <ul aria-label="Cart summary">
        {cart.items.map((item) => (
          <li key={item.productId}>
            {item.productName} x {item.quantity}
          </li>
        ))}
      </ul>
      <label htmlFor="idempotencyKey">Order reference (optional)</label>
      <input id="idempotencyKey" {...form.register("idempotencyKey")} />
      {form.formState.errors.idempotencyKey && (
        <p role="alert">{form.formState.errors.idempotencyKey.message}</p>
      )}
      {failureMessage && <p role="alert">{failureMessage}</p>}
      <button
        disabled={
          !form.formState.isValid ||
          form.formState.isSubmitting ||
          submissionLocked
        }
        type="submit"
      >
        {form.formState.isSubmitting ? "Submitting..." : "Submit order"}
      </button>
    </form>
  );
}
