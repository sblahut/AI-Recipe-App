import Constants from "expo-constants";

const DEFAULT_METRO_PORT = 8081;

/** Build exp:// for Expo Go on the LAN (Metro), not the kitchen API. */
export function expoGoProjectUrlFromHost(
  hostUri: string | null | undefined,
  lanHost: string | null | undefined,
  metroPort = DEFAULT_METRO_PORT,
): string | null {
  if (hostUri?.trim()) {
    const trimmed = hostUri.trim();
    const [host, portPart] = trimmed.split(":");
    const normalizedHost = host?.toLowerCase() ?? "";
    const port = portPart ?? String(metroPort);
    if (
      normalizedHost &&
      normalizedHost !== "localhost" &&
      normalizedHost !== "127.0.0.1"
    ) {
      return `exp://${normalizedHost}:${port}`;
    }
  }

  const lan = lanHost?.trim();
  if (lan) {
    return `exp://${lan}:${metroPort}`;
  }

  return null;
}

/** Prefer Expo hostUri; fall back to API-reported LAN (e.g. web on localhost:8081). */
export function expoGoDisplayUrl(lanHost: string | null | undefined): string | null {
  return expoGoProjectUrlFromHost(Constants.expoConfig?.hostUri, lanHost);
}

export function qrCodeImageUri(payload: string): string {
  const data = encodeURIComponent(payload.trim());
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
}
