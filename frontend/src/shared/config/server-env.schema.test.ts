import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseServerEnv } from "./server-env.schema";

describe("parseServerEnv", () => {
  it("accepts valid server service URLs", () => {
    expect(
      parseServerEnv({
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

  it("rejects missing configuration", () => {
    expect(() =>
      parseServerEnv({
        CART_SERVICE_URL: "http://localhost:8080",
        PRODUCT_SERVICE_URL: "http://localhost:8083",
      }),
    ).toThrow(z.ZodError);
  });
});
