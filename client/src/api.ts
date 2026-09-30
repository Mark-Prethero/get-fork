export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { error?: string } : ({} as T);
  if (!response.ok) {
    const error = new Error((data as { error?: string }).error || "Request failed.") as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = (data as { code?: string }).code;
    throw error;
  }
  return data;
}

export function adminToken(): string {
  return sessionStorage.getItem("fork.admin") ?? "";
}

export function runToken(runId: string): string {
  return sessionStorage.getItem(`fork.token.${runId}`) ?? "";
}

export function saveRunToken(runId: string, token: string): void {
  sessionStorage.setItem(`fork.token.${runId}`, token);
}
