const baseUrl = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

interface ApiRequest {
  password: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

async function errorCodeOf(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  return payload?.error ?? "unknown_error";
}

export async function apiFetch<T>(path: string, { password, method = "GET", body }: ApiRequest): Promise<T> {
  const headers = new Headers({ Authorization: `Bearer ${password}` });
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw new ApiError(response.status, await errorCodeOf(response));
  return response.json();
}
