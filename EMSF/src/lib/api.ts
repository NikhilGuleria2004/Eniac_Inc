const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

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

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string | null) {
  accessToken = access;
  if (refresh) refreshToken = refresh;
  if (access) {
    localStorage.setItem("accessToken", access);
  }
  if (refresh) {
    localStorage.setItem("refreshToken", refresh);
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  const stored = localStorage.getItem("accessToken");
  if (stored) accessToken = stored;
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  const stored = localStorage.getItem("refreshToken");
  if (stored) refreshToken = stored;
  return refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;
  const token = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.json();

  if (!response.ok) {
    const errorBody = body as ApiError;
    throw new ApiRequestError(errorBody.error?.code || "API_ERROR", errorBody.error?.message || response.statusText, errorBody.error?.fields);
  }

  return body as ApiResponse<T>;
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

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh })
    });

    const body = await res.json();
    if (res.ok && body.success) {
      setTokens(body.data.accessToken, null);
      return body.data.accessToken;
    }
    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
