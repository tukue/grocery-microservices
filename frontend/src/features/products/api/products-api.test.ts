import { describe, expect, it } from "vitest";

import { ApplicationError, createApplicationError } from "@/shared/errors/application-error";
import type { ServerHttpClient } from "@/shared/http/server-http-client";

import { createProductsApi } from "./products-api";

function httpReturning(value: unknown): ServerHttpClient {
  return { request: async <TResponse>() => value as TResponse };
}

describe("ProductsApi", () => {
  it("returns product domain models from a successful response", async () => {
    const products = await createProductsApi(
      httpReturning([{ available: true, currency: "SEK", description: "Crisp apples.", id: 1, name: "Apples", price: 29.9 }]),
    ).list();

    expect(products).toEqual([
      { available: true, currency: "SEK", description: "Crisp apples.", id: 1, imageUrl: undefined, name: "Apples", price: 29.9 },
    ]);
  });

  it("rejects an invalid transport response", async () => {
    await expect(
      createProductsApi(httpReturning([{ available: true, currency: "SEK", description: "Crisp apples.", id: 1, name: "Apples", price: -1 }])).list(),
    ).rejects.toThrow();
  });

  it("preserves an unavailable product-service error", async () => {
    const error = createApplicationError("service-unavailable");
    const http: ServerHttpClient = { request: async <TResponse>() => Promise.reject(error) as TResponse };

    await expect(createProductsApi(http).list()).rejects.toBe(error);
    expect(error).toBeInstanceOf(ApplicationError);
  });
});
