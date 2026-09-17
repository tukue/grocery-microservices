import "server-only";

import {
  ApplicationError,
  createApplicationError,
} from "@/shared/errors/application-error";

export type ServerHttpRequest = Readonly<{
  body?: unknown;
  correlationId?: string;
  headers?: HeadersInit;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  timeoutMs?: number;
}>;

export type ServerHttpClientOptions = Readonly<{
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}>;

export type ServerHttpClient = Readonly<{
  request<TResponse>(request: ServerHttpRequest): Promise<TResponse>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function getValidationErrors(
  value: unknown,
): Readonly<Record<string, string>> | undefined {
  if (!isRecord(value) || !isRecord(value.errors)) {
    return undefined;
  }

  const errors = Object.entries(value.errors).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return errors.length > 0 ? Object.fromEntries(errors) : undefined;
}

async function toApplicationError(
  response: Response,
): Promise<ApplicationError> {
  const payload: unknown = await response.json().catch(() => undefined);
  const validationErrors = getValidationErrors(payload);

  if (
    (response.status === 400 || response.status === 422) &&
    validationErrors
  ) {
    return createApplicationError("validation", validationErrors);
  }

  if (response.status === 401 || response.status === 403) {
    return createApplicationError("unauthorized");
  }

  if (response.status === 404) {
    return createApplicationError("not-found");
  }

  if (response.status >= 500) {
    return createApplicationError("service-unavailable");
  }

  return createApplicationError("unexpected");
}

function toRequestUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;
  return new URL(path.replace(/^\//, ""), normalizedBaseUrl).toString();
}

export function createServerHttpClient(
  options: ServerHttpClientOptions,
): ServerHttpClient {
  const baseUrl = new URL(options.baseUrl).toString();
  const requestTimeoutMs = options.timeoutMs ?? 5_000;
  const fetchImplementation = options.fetch ?? fetch;

  return {
    async request<TResponse>(request: ServerHttpRequest): Promise<TResponse> {
      const timeoutController = new AbortController();
      const timeout = setTimeout(
        () => timeoutController.abort(),
        request.timeoutMs ?? requestTimeoutMs,
      );
      const headers = new Headers(request.headers);

      headers.set("Accept", "application/json");
      if (request.body !== undefined) {
        headers.set("Content-Type", "application/json");
      }
      if (request.correlationId) {
        headers.set("X-Correlation-Id", request.correlationId);
      }

      try {
        const response = await fetchImplementation(
          toRequestUrl(baseUrl, request.path),
          {
            body:
              request.body === undefined
                ? undefined
                : JSON.stringify(request.body),
            headers,
            method: request.method ?? "GET",
            signal: timeoutController.signal,
          },
        );

        if (!response.ok) {
          throw await toApplicationError(response);
        }

        return (await response.json()) as TResponse;
      } catch (error) {
        if (error instanceof ApplicationError) {
          throw error;
        }
        if (isAbortError(error)) {
          throw createApplicationError("timeout");
        }
        throw createApplicationError("unexpected");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
