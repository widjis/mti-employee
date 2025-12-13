type ApiInit = RequestInit & { skipAuth?: boolean };

const getToken = () => {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
};

const buildHeaders = (init?: ApiInit): HeadersInit => {
  const base: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const headers = new Headers(init?.headers || base);
  if (!init?.skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

async function apiFetch<T = unknown>(path: string, init?: ApiInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: buildHeaders(init),
  });

  let data: unknown = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    interface ApiError extends Error { status?: number; body?: unknown }
    let message = "Request failed";
    if (typeof data === "string") {
      message = data;
    } else if (typeof data === "object" && data !== null && "error" in (data as Record<string, unknown>)) {
      const maybeError = (data as Record<string, unknown>).error;
      if (typeof maybeError === "string") message = maybeError;
    }
    const err: ApiError = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data as T;
}

export const api = {
  fetch: apiFetch,
  get: <T = unknown>(path: string, init?: ApiInit) => apiFetch<T>(path, { ...init, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
    apiFetch<T>(path, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
    apiFetch<T>(path, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string, init?: ApiInit) => apiFetch<T>(path, { ...init, method: "DELETE" }),
};

export type { ApiInit };