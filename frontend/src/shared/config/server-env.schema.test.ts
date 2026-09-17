import { describe, expect, it } from "vitest";

import { loadServerEnv } from "./server-env.schema";

describe("loadServerEnv", () => {
  it("accepts valid server service URLs", () => {
    expect(
      loadServerEnv({
        CART_SERVICE_URL: "http://localhost:8080",
        ORDER_SERVICE_URL: "http://localhost:8081",
        PRODUCT_SERVICE_URL: "http://localhost:8083",
      }),
    ).toEqual({
      CART_SERVICE_URL: "http://localhost:8080",
      ORDER_SERVICE_URL: "http://localhost:8081",
      PRODUCT_SERVICE_URL: "http://localhost:8083",
    });
  });

  it("reports missing configuration by variable name", () => {
    expect(() =>
      loadServerEnv({
        CART_SERVICE_URL: "http://localhost:8080",
        PRODUCT_SERVICE_URL: "http://localhost:8083",
      }),
    ).toThrow(
      "Invalid server environment configuration. Set valid URL values for: ORDER_SERVICE_URL.",
    );
  });
});
