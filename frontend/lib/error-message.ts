import { ApiError } from "@/lib/api";

/** Human-readable message from thrown API/network errors. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
