import { describe, it, expect } from "vitest";
import { sendMessageSchema } from "@/lib/validation/messages";

describe("sendMessageSchema", () => {
  it("accepts a plain message with no visibility or attachments", () => {
    expect(sendMessageSchema.safeParse({ body: "Sounds good!" }).success).toBe(true);
  });

  it("accepts an explicit visibility", () => {
    expect(sendMessageSchema.safeParse({ body: "Internal note", visibility: "internal" }).success).toBe(true);
  });

  it("accepts up to 10 attachments", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `version-${i}`);
    expect(sendMessageSchema.safeParse({ body: "See attached", attachmentVersionIds: ids }).success).toBe(true);
  });

  it("rejects more than 10 attachments", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `version-${i}`);
    expect(sendMessageSchema.safeParse({ body: "See attached", attachmentVersionIds: ids }).success).toBe(false);
  });

  it("rejects an empty body", () => {
    expect(sendMessageSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects an invalid visibility value", () => {
    expect(sendMessageSchema.safeParse({ body: "x", visibility: "public" }).success).toBe(false);
  });
});
