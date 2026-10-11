import { apiFetch } from "./authService";

export type QueryValue = string | number | boolean | null | undefined;

export function toQueryString(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Authenticated, branch-scoped GET of a report/export endpoint. */
export function fetchReport<T>(path: string, params: Record<string, QueryValue> = {}) {
  return apiFetch<T>(`${path}${toQueryString(params)}`, { method: "GET" });
}

export interface ExportResponse<T, Totals = Record<string, unknown>> {
  success: boolean;
  count: number;
  records: T[];
  totals: Totals;
  branch?: { id: string; name: string };
  period?: { description: string; start: string; endExclusive: string };
  generatedAt: string;
}

/**
 * Downloads EVERY record matching the filters from a module's /export
 * endpoint (server-side, independent of the page shown in the UI).
 */
export function fetchExport<T, Totals = Record<string, unknown>>(path: string, params: Record<string, QueryValue>) {
  return fetchReport<ExportResponse<T, Totals>>(path, params);
}
