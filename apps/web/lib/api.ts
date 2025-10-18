import supabase from "@greenlight/db/client";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export async function apiRequest<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch (error) {
    console.warn("Unable to read Supabase session", error);
  }

  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.error || response.statusText;
    throw new Error(message);
  }

  return payload as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}
