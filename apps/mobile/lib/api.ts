import { formatApiDetail } from "@/lib/formatApiDetail";
import { getStoredServerUrl } from "@/lib/storage";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = RequestInit & {
  baseUrl?: string;
};

async function resolveBaseUrl(override?: string): Promise<string> {
  if (override) {
    return override.replace(/\/+$/, "");
  }
  const stored = await getStoredServerUrl();
  if (stored) {
    return stored.replace(/\/+$/, "");
  }
  throw new Error("No server URL configured. Open Settings and set your PC API address.");
}

function networkMessage(url: string): string {
  return (
    `Could not reach ${url}. Check that server/run.ps1 is running, Settings uses port 8000 ` +
    `(not Metro 8081), and your phone is on the same Wi‑Fi as the PC.`
  );
}

export async function apiFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  const { baseUrl: baseOverride, ...init } = options;
  const baseUrl = await resolveBaseUrl(baseOverride);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error(networkMessage(baseUrl));
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && "detail" in body) {
        const formatted = formatApiDetail((body as Record<string, unknown>).detail);
        if (formatted) {
          detail = formatted;
        }
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(detail || `HTTP ${response.status}`, response.status);
  }

  return response;
}

export async function apiJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
