import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReceipt, ReceiptError } from "../api/receipt-client";
import type { Receipt } from "../domain/receipt";

type State = "loading" | "pending" | "ready" | "delayed" | "error";
export function ReceiptPanel({
  orderId,
  loadReceipt = fetchReceipt,
  waitBudget = 30_000,
  initialDelay = 1_000,
}: {
  orderId: number;
  loadReceipt?: typeof fetchReceipt;
  waitBudget?: number;
  initialDelay?: number;
}) {
  const [state, setState] = useState<State>("loading");
  const [content, setContent] = useState("");
  const [error, setError] = useState<ReceiptError>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let delay = initialDelay;
    setState("loading");
    setError(undefined);
    setContent("");
    async function poll() {
      try {
        const receipt: Receipt = await loadReceipt(orderId, controller.signal);
        if (controller.signal.aborted) return;
        if (receipt.status === "ready") {
          setContent(receipt.content);
          setState("ready");
          return;
        }
        if (Date.now() - started >= waitBudget) {
          setState("delayed");
          return;
        }
        setState("pending");
        timer = setTimeout(
          () => void poll(),
          Math.min(delay, waitBudget - (Date.now() - started)),
        );
        delay = Math.min(delay * 2, 5_000);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof ReceiptError ? cause : new ReceiptError(502));
        setState("error");
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, retry, loadReceipt, waitBudget, initialDelay]);
  return (
    <section className="receipt-panel" aria-label="Order receipt">
      <h2>Your receipt</h2>
      {state === "ready" ? (
        <>
          <p>Your receipt is ready.</p>
          <pre>{content}</pre>
          <button
            className="button-secondary"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([content], { type: "text/plain;charset=utf-8" }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = `fresh-cart-receipt-${orderId}.txt`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1_000);
            }}
          >
            Download receipt
          </button>
        </>
      ) : state === "error" ? (
        <>
          <p role="alert">{error?.message}</p>
          {error?.status === 401 ? (
            <Link to="/login" state={{ from: `/confirmation/${orderId}` }}>
              Sign in again
            </Link>
          ) : (
            error?.status !== 403 &&
            error?.status !== 404 && (
              <button
                className="button-secondary"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry receipt
              </button>
            )
          )}
        </>
      ) : (
        <>
          <p>
            {state === "delayed"
              ? "Your receipt is still being prepared. Your order is saved; you do not need to place it again."
              : "Your order is saved. We’re preparing your receipt."}
          </p>
          {state === "delayed" && (
            <button
              className="button-secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              Check receipt again
            </button>
          )}
        </>
      )}
    </section>
  );
}
