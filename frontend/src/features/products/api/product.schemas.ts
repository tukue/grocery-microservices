import { z } from "zod";

export const productResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  price: z.number(),
});

export const productListResponseSchema = z.array(productResponseSchema);

export const productApiErrorSchema = z.object({
  code: z.enum(["INTERNAL_ERROR", "NOT_FOUND", "VALIDATION_FAILED"]),
  errors: z.record(z.string(), z.string()),
  message: z.string(),
});

export type ProductApiError = z.infer<typeof productApiErrorSchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
