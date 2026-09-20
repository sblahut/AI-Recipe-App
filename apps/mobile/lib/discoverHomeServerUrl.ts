import { Platform } from "react-native";

import { apiJson } from "@/lib/api";
import { healthSchema, homeNetworkSchema } from "@/lib/schemas";
import { DEFAULT_SERVER_URL } from "@/lib/storage";

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Find the phone-reachable kitchen API URL via a reachable probe (often 127.0.0.1 on the PC). */
export async function discoverHomeServerApiUrl(storedUrl: string | null): Promise<string | null> {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const raw of [
    storedUrl,
    Platform.OS === "web" ? "http://127.0.0.1:8000" : null,
    DEFAULT_SERVER_URL,
  ]) {
    if (!raw) {
      continue;
    }
    const base = normalizeBase(raw);
    if (seen.has(base)) {
      continue;
    }
    seen.add(base);
    candidates.push(base);
  }

  for (const probe of candidates) {
    try {
      const networkRaw = await apiJson<unknown>("/meta/home-network", { baseUrl: probe });
      const network = homeNetworkSchema.parse(networkRaw);
      const apiBase = network.api_base_url?.trim();
      if (!apiBase) {
        continue;
      }
      const healthRaw = await apiJson<unknown>("/health", { baseUrl: apiBase });
      healthSchema.parse(healthRaw);
      return normalizeBase(apiBase);
    } catch {
      // try next probe
    }
  }

  return null;
}
