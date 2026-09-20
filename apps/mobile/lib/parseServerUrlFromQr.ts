import { qrCodeImageUri } from "@/lib/expoGoDevUrl";

const SERVER_QUERY_KEYS = ["server", "url", "serverUrl"] as const;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

function withHttpScheme(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (isHttpUrl(trimmed)) {
    return stripTrailingSlash(trimmed);
  }
  if (/^([a-z0-9-]+\.)+[a-z0-9-]+(:\d+)?$/i.test(trimmed) || /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(trimmed)) {
    return stripTrailingSlash(`http://${trimmed}`);
  }
  return null;
}

/** Read a home-server URL from a QR payload (plain URL or airecipe deep link). */
export function parseServerUrlFromQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const asHttp = withHttpScheme(trimmed);
  if (asHttp) {
    return asHttp;
  }

  try {
    const parsed = new URL(trimmed);
    for (const key of SERVER_QUERY_KEYS) {
      const value = parsed.searchParams.get(key)?.trim();
      if (value) {
        const nested = withHttpScheme(value) ?? (isHttpUrl(value) ? stripTrailingSlash(value) : null);
        if (nested) {
          return nested;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Why a phone cannot use this as Home server (loopback or Expo Metro port). */
export function phoneUnreachableHomeServerReason(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Use a full URL like http://192.168.1.50:8000";
  }

  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  if (port === "8081") {
    return "Port 8081 is Expo/Metro (open the app UI). Home server is the API on port 8000.";
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") {
    return "localhost / 127.0.0.1 is this phone, not your PC. Use the LAN or Tailscale URL on port 8000.";
  }

  return null;
}

export function canShowHomeServerQr(serverUrl: string): boolean {
  const normalized = withHttpScheme(serverUrl);
  return normalized != null && phoneUnreachableHomeServerReason(normalized) == null;
}

export function serverUrlQrImageUri(serverUrl: string): string {
  const normalized = withHttpScheme(serverUrl) ?? stripTrailingSlash(serverUrl.trim());
  return qrCodeImageUri(normalized);
}
