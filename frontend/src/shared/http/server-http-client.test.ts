import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createServerHttpClient } from "./server-http-client";

describe("createServerHttpClient", () => {
  it("sends JSON and forwards a correlation ID", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ accepted: true }), { status: 200 }),
      );
    const client = createServerHttpClient({
      baseUrl: "http://product-service:8080",
      fetch: fetchMock,
    });

    await expect(
      client.request<{ accepted: boolean }>({
        body: { name: "Apples" },
        correlationId: "request-123",
        method: "POST",
        path: "/products",
      }),
    ).resolves.toEqual({ accepted: true });

    const requestOptions = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://product-service:8080/products",
    );
    expect(requestOptions?.body).toBe('{"name":"Apples"}');
    expect(new Headers(requestOptions?.headers).get("X-Correlation-Id")).toBe(
      "request-123",
    );
  });

  it("normalizes not-found responses", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: "NOT_FOUND" }), { status: 404 }),
      );
    const client = createServerHttpClient({
      baseUrl: "http://product-service:8080",
      fetch: fetchMock,
    });

    await expect(
      client.request({ path: "/products/99" }),
    ).rejects.toMatchObject({
      customerMessage: "The requested resource could not be found.",
      kind: "not-found",
    });
  });

  it("normalizes aborted requests as timeouts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const client = createServerHttpClient({
      baseUrl: "http://product-service:8080",
      fetch: fetchMock,
      timeoutMs: 10,
    });

    const response = expect(
      client.request({ path: "/products" }),
    ).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(10);

    await response;
    vi.useRealTimers();
  });
});
