import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { apiJson } from "@/lib/api";
import {
  defaultHomeServerReady,
  homeServerReadyFromHealth,
  type HomeServerReady,
} from "@/lib/homeServerReady";
import { healthSchema, ingredientSchema } from "@/lib/schemas";

export type { HomeServerReady };

export function useHomeServerReady() {
  const { serverUrl } = useServerSettings();
  const [ready, setReady] = useState<HomeServerReady>(defaultHomeServerReady);

  const refresh = useCallback(async () => {
    try {
      const [healthRaw, inventoryRaw] = await Promise.all([
        apiJson<unknown>("/health", { baseUrl: serverUrl }),
        apiJson<unknown>("/inventory", { baseUrl: serverUrl }),
      ]);
      const health = healthSchema.parse(healthRaw);
      const inventory = z.array(ingredientSchema).parse(inventoryRaw);
      setReady(homeServerReadyFromHealth(health, inventory.length));
    } catch {
      setReady(defaultHomeServerReady);
    }
  }, [serverUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  return { ready, refresh };
}
