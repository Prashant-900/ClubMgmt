/**
 * Shared unwrapping for the `{ success:false, message, status }` rejections
 * thrown by `apiRequest`.
 *
 * Lives next to the hooks that consume it because every list/grid needs it —
 * previously each component re-implemented the same `typeof err === "object"`
 * dance inline.
 */

interface ApiErrorShape {
  message?: unknown;
  status?: unknown;
}

/** Best-effort human-readable message for an unknown thrown value. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as ApiErrorShape;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

/** HTTP status attached by `apiRequest`, when there is one. */
export function getApiErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object" && "status" in error) {
    const { status } = error as ApiErrorShape;
    if (typeof status === "number") return status;
  }
  return null;
}
