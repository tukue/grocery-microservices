import { describe, expect, it } from "vitest";

import { toBearerAuthorization } from "./bearer-token";

describe("toBearerAuthorization", () => {
  it("creates an authorization value for a JWT-shaped token", () => {
    expect(toBearerAuthorization("header.payload.signature")).toBe("Bearer header.payload.signature");
  });

  it("rejects values that could inject a header", () => {
    expect(toBearerAuthorization("header.payload.signature\r\nX-Injected: true")).toBeUndefined();
  });

  it("rejects malformed values", () => {
    expect(toBearerAuthorization("opaque-token")).toBeUndefined();
  });
});
