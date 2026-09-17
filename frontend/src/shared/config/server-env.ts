import "server-only";

import { loadServerEnv } from "./server-env.schema";

export { loadServerEnv, serverEnvSchema } from "./server-env.schema";
export type { ServerEnv } from "./server-env.schema";

export const serverEnv = loadServerEnv(process.env);
