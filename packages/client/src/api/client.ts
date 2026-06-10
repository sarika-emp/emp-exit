import axios from "axios";
import type { ApiResponse } from "@emp-exit/shared";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — the session expired or the token is invalid. Clear it and send
// the user to login with a flag so the login page can explain why. Skipped for
// the SSO exchange and for the login request itself (a 401 there means bad
// credentials, which the login page surfaces directly — not "session expired").
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRequest = requestUrl.includes("/auth/sso") || requestUrl.includes("/auth/login");
    const hadSession = !!localStorage.getItem("access_token");

    if (error.response?.status === 401 && !isAuthRequest && hadSession) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login?session=expired";
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------

export async function apiGet<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  return data;
}

export async function apiPost<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data;
}

export async function apiPut<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data;
}

export async function apiPatch<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  const { data } = await api.patch<ApiResponse<T>>(url, body);
  return data;
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const { data } = await api.delete<ApiResponse<T>>(url);
  return data;
}
