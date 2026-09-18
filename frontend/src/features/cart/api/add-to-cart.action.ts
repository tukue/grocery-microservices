"use server";

import { cookies } from "next/headers";

import { ApplicationError } from "@/shared/errors/application-error";

import { addCartItemRequestSchema } from "./cart.schemas";
import { addProductToCart } from "./cart.server";
import { toBearerAuthorization } from "./bearer-token";

export type AddToCartResult =
  | Readonly<{ message: string; status: "success" }>
  | Readonly<{ message: string; status: "error" }>;

export async function addToCartAction(productId: number, quantity = 1): Promise<AddToCartResult> {
  try {
    const request = addCartItemRequestSchema.parse({ productId, quantity });
    const token = (await cookies()).get("access_token")?.value;
    const authorization = toBearerAuthorization(token);
    if (!authorization) return { message: "Please sign in to add items to your cart.", status: "error" };

    await addProductToCart(request.productId, request.quantity, authorization);
    return { message: "Added to cart.", status: "success" };
  } catch (error) {
    if (error instanceof ApplicationError) return { message: error.customerMessage, status: "error" };
    return { message: "We could not add this item to your cart. Please try again.", status: "error" };
  }
}
