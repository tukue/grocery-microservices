import { notifySessionExpired } from "../../../shared/http/session-expired";
import { z } from "zod";
import type { Receipt } from "../domain/receipt";
const receiptSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("ready"), content: z.string().trim().min(1) }),
]);
export class ReceiptError extends Error {
  constructor(readonly status: number) {
    super(
      status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You do not have access to this receipt."
          : status === 404
            ? "Order not found."
            : "Receipt service is temporarily unavailable.",
    );
  }
}
export async function fetchReceipt(
  orderId: number,
  signal?: AbortSignal,
): Promise<Receipt> {
  if (!Number.isSafeInteger(orderId) || orderId <= 0)
    throw new ReceiptError(400);
  const response = await fetch(
    `/api/customer/ledger/orders/${orderId}/receipt`,
    { headers: { accept: "application/json" }, signal },
  );
  notifySessionExpired(response.status);
  if (!response.ok) throw new ReceiptError(response.status);
  return receiptSchema.parse(await response.json());
}
