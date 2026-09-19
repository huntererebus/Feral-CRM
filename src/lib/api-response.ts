import { UnauthenticatedError, TenantMismatchError } from "@/lib/session";
import { ForbiddenError } from "@/lib/rbac";
import { TenantResolutionError } from "@/lib/tenant";
import { ZodError } from "zod";
import { jsonError } from "@/lib/json-response";

export { jsonOk, jsonError } from "@/lib/json-response";

/**
 * Wraps a route handler so every route gets consistent error → status-code
 * mapping without repeating try/catch boilerplate. Existence-sensitive
 * resources should still be checked explicitly for the 404-instead-of-403
 * treatment described in planning-doc.md Section 8 — this wrapper covers
 * the general cases, not that specific judgment call.
 */
export function withRouteErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof UnauthenticatedError) {
        return jsonError("UNAUTHENTICATED", "Sign-in required.", 401);
      }
      if (err instanceof TenantMismatchError || err instanceof TenantResolutionError) {
        // Deliberately vague message — see Section 8's note on not leaking
        // *why* an org/resource is unreachable.
        return jsonError("NOT_FOUND", "Not found.", 404);
      }
      if (err instanceof ForbiddenError) {
        return jsonError("FORBIDDEN", err.message, 403);
      }
      if (err instanceof ZodError) {
        return jsonError("VALIDATION_ERROR", err.issues.map((i) => i.message).join("; "), 422);
      }
      console.error("Unhandled API error:", err);
      return jsonError("INTERNAL_ERROR", "Something went wrong.", 500);
    }
  };
}
