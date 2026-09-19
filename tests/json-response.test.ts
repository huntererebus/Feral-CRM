import { describe, it, expect } from "vitest";
import { jsonOk } from "@/lib/json-response";

describe("jsonOk — BigInt-safe serialization", () => {
  it("does not throw on a bigint field (previously crashed here — MediaVersion.fileSizeBytes, Organization.storageLimitBytes)", async () => {
    const response = jsonOk({ fileSizeBytes: 123456789n });
    const body = await response.json();
    expect(body.data.fileSizeBytes).toBe("123456789");
  });

  it("serializes a bigint as a string, not a number, to avoid precision loss above MAX_SAFE_INTEGER", async () => {
    const huge = 9_007_199_254_740_993n; // MAX_SAFE_INTEGER + 2, not exactly representable as a JS number
    const response = jsonOk({ n: huge });
    const body = await response.json();
    expect(body.data.n).toBe(huge.toString());
  });

  it("leaves ordinary fields untouched", async () => {
    const response = jsonOk({ name: "test", count: 5, nested: { ok: true } });
    const body = await response.json();
    expect(body.data).toEqual({ name: "test", count: 5, nested: { ok: true } });
  });

  it("still applies the requested status code", () => {
    const response = jsonOk({ ok: true }, { status: 201 });
    expect(response.status).toBe(201);
  });
});
