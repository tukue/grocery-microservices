import { describe, expect, it } from "vitest";
import { productResponseSchema } from "./product.schemas";

const valid = {
  id: 1,
  name: "Apple",
  description: "Fresh",
  price: 1.25,
  currency: "SEK",
  available: true,
  stockQuantity: 0,
  imageUrl: null,
};
describe("productResponseSchema", () => {
  it("accepts the complete boundary shape", () =>
    expect(productResponseSchema.parse(valid)).toEqual(valid));
  it.each([
    { ...valid, id: 0 },
    { ...valid, price: 0 },
    { ...valid, name: " " },
    { ...valid, currency: "sek" },
    { ...valid, stockQuantity: -1 },
    { ...valid, imageUrl: "bad" },
  ])("rejects invalid constraints", (value) =>
    expect(productResponseSchema.safeParse(value).success).toBe(false),
  );
});
