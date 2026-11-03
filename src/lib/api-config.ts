export const DEFAULT_API_BASE_URL = "http://localhost:8081";

export const resolveApiBaseUrl = (configured?: string) =>
  (configured?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
