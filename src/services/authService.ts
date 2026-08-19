/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LoginPayload, RegisterPayload, LoginResponse, User } from "../types/auth";
import { serverUrl } from "../utils/constants";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") ||
  `${serverUrl}`; // adjust if needed

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const activeBranchId = typeof window !== "undefined" ? localStorage.getItem("activeBranchId") : null;
  const isAuthEndpoint = path.startsWith("/auth/");

  if (!token && !isAuthEndpoint) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(token && activeBranchId ? { "X-Branch-Id": activeBranchId } : {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as any;

  // A 401 from /auth/login or /auth/register just means wrong credentials —
  // that must surface as a normal form error, not a forced logout/redirect.
  if (res.status === 401 && !isAuthEndpoint) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  return data as T;
}

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Only if you implement it on the server:
export function fetchMe() {
  return apiFetch<User>("/users/me", { method: "GET" });
}
