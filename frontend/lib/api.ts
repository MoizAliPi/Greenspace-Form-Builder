import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/auth-storage";

export function getApiV1BaseUrl(): string {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  return `${base}/api/v1`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractMessage(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "detail" in detail) {
    return extractMessage((detail as { detail: unknown }).detail);
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      return String((first as { msg: unknown }).msg);
    }
  }
  return undefined;
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** When true, do not send `Authorization: Bearer` (login/register). */
  skipAuth?: boolean;
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth, body, headers: initHeaders, ...rest } = options;
  const rel = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiV1BaseUrl()}${rel}`;

  const headers = new Headers(initHeaders);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = undefined;
    }
    const message = extractMessage(detail) ?? res.statusText;
    throw new ApiError(res.status, message, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
