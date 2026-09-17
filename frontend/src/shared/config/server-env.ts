import "server-only";

import { parseServerEnv } from "./server-env.schema";

export { parseServerEnv, serverEnvSchema } from "./server-env.schema";
export type { ServerEnv } from "./server-env.schema";

export const serverEnv = parseServerEnv(process.env);
