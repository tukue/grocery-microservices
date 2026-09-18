"use client";

import { useState } from "react";

import { addToCartAction, type AddToCartResult } from "../api/add-to-cart.action";

type AddToCartButtonProps = Readonly<{
  addItem?: (productId: number, quantity?: number) => Promise<AddToCartResult>;
  available: boolean;
  productId: number;
}>;

export function AddToCartButton({ addItem = addToCartAction, available, productId }: AddToCartButtonProps) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AddToCartResult | undefined>();

  async function addItemToCart() {
    if (pending || !available) return;
    setPending(true);
    setResult(undefined);
    try {
      setResult(await addItem(productId));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        aria-describedby={result ? "add-to-cart-feedback" : undefined}
        className="bg-zinc-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        disabled={!available || pending}
        onClick={addItemToCart}
        type="button"
      >
        {pending ? "Adding..." : available ? "Add to cart" : "Unavailable"}
      </button>
      {result ? (
        <p id="add-to-cart-feedback" role="status">{result.message}</p>
      ) : null}
    </div>
  );
}
