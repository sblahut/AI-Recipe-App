const SERVER_QUERY_KEYS = ["server", "url", "serverUrl"] as const;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

/** Read a home-server URL from a QR payload (plain URL or airecipe deep link). */
export function parseServerUrlFromQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (isHttpUrl(trimmed)) {
    return stripTrailingSlash(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    for (const key of SERVER_QUERY_KEYS) {
      const value = parsed.searchParams.get(key)?.trim();
      if (value && isHttpUrl(value)) {
        return stripTrailingSlash(value);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function serverUrlQrImageUri(serverUrl: string): string {
  const data = encodeURIComponent(stripTrailingSlash(serverUrl.trim()));
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
}
