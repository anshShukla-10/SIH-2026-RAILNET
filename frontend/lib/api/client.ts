/**
 * RAILNET-AI Typed API Client & Error Normalization
 *
 * Problem Statement: SIH26027 · Ministry of Railways
 * Source of Truth: frontend/prd.md Section 7
 */

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Helper to inspect if an error is a 404 Not Found
   */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Helper to inspect if an error is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }
}

/**
 * Normalizes environment API base URL (defaults to http://localhost:8000).
 * Strips any trailing slash to prevent double-slash paths.
 */
export function getApiBaseUrl(): string {
  let url = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).trim();

  // If provided domain lacks protocol (e.g. "sih-2026-railnet-production.up.railway.app"), prepend https://
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Core fetch wrapper with typed responses and normalized ApiError exceptions.
 */
export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let fullUrl = `${baseUrl}${normalizedEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(`Network request failed: ${message}`, 0, err);
  }

  if (!response.ok) {
    let errorData: unknown = null;
    let message = `API request failed with status ${response.status}: ${response.statusText}`;

    try {
      errorData = await response.json();
      if (
        errorData &&
        typeof errorData === "object" &&
        "detail" in errorData &&
        typeof (errorData as { detail: unknown }).detail === "string"
      ) {
        message = (errorData as { detail: string }).detail;
      }
    } catch {
      // Body was not JSON; use default message
    }

    throw new ApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
};

