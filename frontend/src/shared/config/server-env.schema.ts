import { z } from "zod";

export const serverEnvSchema = z.object({
  CART_SERVICE_URL: z.string().url(),
  ORDER_SERVICE_URL: z.string().url(),
  PRODUCT_SERVICE_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function loadServerEnv(input: Record<string, unknown>): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const invalidVariableNames = [
    ...new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((path): path is string => typeof path === "string"),
    ),
  ];

  throw new Error(
    `Invalid server environment configuration. Set valid URL values for: ${invalidVariableNames.join(", ")}.`,
  );
}
