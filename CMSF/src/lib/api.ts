const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export const USE_API = import.meta.env.VITE_USE_API !== "false";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

let accessToken: string | null = null;

export function setTokens(access: string | null, refresh?: string | null): void {
  accessToken = access;
  if (typeof localStorage === "undefined") return;
  if (access) localStorage.setItem("cmsf_accessToken", access);
  else localStorage.removeItem("cmsf_accessToken");
  if (refresh) localStorage.setItem("cmsf_refreshToken", refresh);
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("cmsf_accessToken");
}

export function getRefreshToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("cmsf_refreshToken");
}

let isRefreshing = false;
let refreshQueue: (() => void)[] = [];

export async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    await new Promise<void>((resolve) => refreshQueue.push(resolve));
    return !!getAccessToken();
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const body = (await res.json().catch(() => ({}))) as ApiResponse<{ accessToken: string }> | ApiError;

    if (!res.ok || !body.success) {
      const errorMsg = (body as ApiError).error?.message || "Token refresh failed";
      const err = new ApiRequestError(
        (body as ApiError).error?.code || "AUTH_ERROR",
        errorMsg
      );
      throw err;
    }

    const newToken = body.data.accessToken;
    const existingRefresh = getRefreshToken();
    setTokens(newToken, existingRefresh ?? undefined);
    return true;
  } catch {
    clearTokens();
    return false;
  } finally {
    isRefreshing = false;
    refreshQueue.forEach((resolve) => resolve());
    refreshQueue = [];
  }
}

export function clearTokens(): void {
  accessToken = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("cmsf_accessToken");
    localStorage.removeItem("cmsf_refreshToken");
  }
}

export function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const padding = payload.length % 4 === 0 ? "" : "=";
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/") + padding);
    const parsed = JSON.parse(decoded) as { role?: string };
    return parsed.role ?? null;
  } catch {
    return null;
  }
}

export function hasRoleMismatch(storedRole: string): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const tokenRole = decodeJwtRole(token);
  return tokenRole !== null && tokenRole !== storedRole;
}

export function clearTokensIfRoleMismatch(storedRole: string): boolean {
  if (hasRoleMismatch(storedRole)) {
    clearTokens();
    return true;
  }
  return false;
}

export class ApiRequestError extends Error {
  public code: string;
  public fields?: Record<string, string[]>;
  constructor(code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.fields = fields;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;
  const token = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T> | ApiError;

  if (!response.ok) {
    const errorBody = body as ApiError;

    // On 401, attempt a token refresh and retry once
    if (response.status === 401 && !(options as Record<string, unknown>).__isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newToken = getAccessToken();
        const { signal: _omit, ...retryOptions } = options as Record<string, unknown>;
        const retryResponse = await fetch(url, {
          ...retryOptions,
          headers: {
            "Content-Type": "application/json",
            ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
            ...(options.headers as Record<string, string>),
          },
        });

        const retryBody = (await retryResponse.json().catch(() => ({}))) as ApiResponse<T> | ApiError;

        if (!retryResponse.ok) {
          const retryError = retryBody as ApiError;
          throw new ApiRequestError(
            retryError.error?.code || "API_ERROR",
            retryError.error?.message || retryResponse.statusText,
            retryError.error?.fields
          );
        }

        return retryBody as ApiResponse<T>;
      }
    }

    throw new ApiRequestError(
      errorBody.error?.code || "API_ERROR",
      errorBody.error?.message || response.statusText,
      errorBody.error?.fields
    );
  }

  return body as ApiResponse<T>;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
