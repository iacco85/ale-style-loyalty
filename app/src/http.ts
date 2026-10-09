const baseUrl = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    const code = typeof body.error === "string" ? body.error : "unknown_error";
    super(code);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

interface ApiRequest {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
}

export async function apiFetch<T>(path: string, { token, method = "GET", body }: ApiRequest = {}): Promise<T> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => ({})));
  return response.json();
}
