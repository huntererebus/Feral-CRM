import { describe, it, expect } from "vitest";
import {
  createCommentSchema,
  reviewDecisionSchema,
  finalApprovalSchema,
  resolveRevisionRequestSchema,
} from "@/lib/validation/reviews";

describe("createCommentSchema", () => {
  it("accepts a plain client-facing comment with no visibility specified", () => {
    expect(createCommentSchema.safeParse({ body: "Looks great!" }).success).toBe(true);
  });

  it("accepts a timestamp comment", () => {
    expect(createCommentSchema.safeParse({ body: "Fix the cut here", timestampSeconds: 12 }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(createCommentSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a negative timestamp", () => {
    expect(createCommentSchema.safeParse({ body: "x", timestampSeconds: -1 }).success).toBe(false);
  });
});

describe("reviewDecisionSchema", () => {
  it("accepts an approval with no comment", () => {
    expect(reviewDecisionSchema.safeParse({ decision: "approved" }).success).toBe(true);
  });

  it("accepts an approval with a comment too", () => {
    expect(reviewDecisionSchema.safeParse({ decision: "approved", comment: "Love it" }).success).toBe(true);
  });

  it("rejects a revision request with no comment — the editor needs to know what to fix", () => {
    expect(reviewDecisionSchema.safeParse({ decision: "revision_requested" }).success).toBe(false);
  });

  it("rejects a revision request with a whitespace-only comment", () => {
    expect(reviewDecisionSchema.safeParse({ decision: "revision_requested", comment: "   " }).success).toBe(false);
  });

  it("accepts a revision request with a real comment", () => {
    expect(
      reviewDecisionSchema.safeParse({ decision: "revision_requested", comment: "Trim the intro" }).success
    ).toBe(true);
  });

  it("rejects an invalid decision value", () => {
    expect(reviewDecisionSchema.safeParse({ decision: "maybe" }).success).toBe(false);
  });
});

describe("finalApprovalSchema", () => {
  it("accepts an empty object (comment is optional)", () => {
    expect(finalApprovalSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a comment", () => {
    expect(finalApprovalSchema.safeParse({ comment: "Ship it" }).success).toBe(true);
  });
});

describe("resolveRevisionRequestSchema", () => {
  it("accepts moving to in_progress with no resolvedByVersionId", () => {
    expect(resolveRevisionRequestSchema.safeParse({ status: "in_progress" }).success).toBe(true);
  });

  it("accepts moving to resolved with a resolvedByVersionId", () => {
    expect(
      resolveRevisionRequestSchema.safeParse({ status: "resolved", resolvedByVersionId: "version-1" }).success
    ).toBe(true);
  });

  it("accepts moving to resolved with no resolvedByVersionId (still valid at the schema level)", () => {
    expect(resolveRevisionRequestSchema.safeParse({ status: "resolved" }).success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    expect(resolveRevisionRequestSchema.safeParse({ status: "done" }).success).toBe(false);
  });
});
