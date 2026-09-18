"use client";

import { useMemo, useState } from "react";

import type { CartSummary, Order, OrderLine } from "../domain/order";
import { submitOrderFromClient } from "../api/client-order-submission";
import { CheckoutForm } from "./checkout-form";

const availableProduct = {
  id: 12,
  name: "Apples",
  price: 29.9,
};

function toCartLine(quantity: number): OrderLine {
  return {
    lineTotal: availableProduct.price * quantity,
    productId: availableProduct.id,
    productName: availableProduct.name,
    quantity,
    unitPrice: availableProduct.price,
  };
}

export function Storefront() {
  const [cartItems, setCartItems] = useState<readonly OrderLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order>();
  const cart = useMemo<CartSummary>(
    () => ({
      id: 42,
      items: cartItems,
      total: cartItems.reduce((total, item) => total + item.lineTotal, 0),
    }),
    [cartItems],
  );

  function addProduct(): void {
    setCartItems((items) => [toCartLine((items[0]?.quantity ?? 0) + 1)]);
    setConfirmedOrder(undefined);
  }

  function updateQuantity(value: string): void {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return;
    }
    setCartItems([toCartLine(quantity)]);
  }

  function confirmOrder(order: Order): void {
    setConfirmedOrder(order);
    setCartItems([]);
    setCheckoutOpen(false);
  }

  return (
    <main>
      <h1>Products</h1>
      <article>
        <h2>{availableProduct.name}</h2>
        <p>{availableProduct.price.toFixed(2)}</p>
        <button onClick={addProduct} type="button">
          Add Apples to cart
        </button>
      </article>

      <button onClick={() => setCartOpen(true)} type="button">
        Open cart ({cart.items.length})
      </button>

      {cartOpen && (
        <section aria-label="Cart">
          <h2>Cart</h2>
          {cart.items.map((item) => (
            <label key={item.productId}>
              Quantity
              <input
                aria-label="Quantity"
                min="1"
                onChange={(event) => updateQuantity(event.target.value)}
                type="number"
                value={item.quantity}
              />
            </label>
          ))}
          {cart.items.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <button onClick={() => setCheckoutOpen(true)} type="button">
              Checkout
            </button>
          )}
        </section>
      )}

      {checkoutOpen && (
        <CheckoutForm
          cart={cart}
          onConfirmed={confirmOrder}
          submitOrder={submitOrderFromClient}
        />
      )}

      {confirmedOrder && (
        <p role="status">Order #{confirmedOrder.id} confirmed</p>
      )}
    </main>
  );
}
