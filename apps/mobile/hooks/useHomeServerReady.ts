import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { apiJson } from "@/lib/api";
import { healthSchema, ingredientSchema } from "@/lib/schemas";

export type HomeServerReady = {
  serverOk: boolean;
  ollamaOk: boolean | null;
  ingredientCount: number;
};

const defaultReady: HomeServerReady = {
  serverOk: false,
  ollamaOk: null,
  ingredientCount: 0,
};

export function useHomeServerReady() {
  const { serverUrl } = useServerSettings();
  const [ready, setReady] = useState<HomeServerReady>(defaultReady);

  const refresh = useCallback(async () => {
    try {
      const [healthRaw, inventoryRaw] = await Promise.all([
        apiJson<unknown>("/health", { baseUrl: serverUrl }),
        apiJson<unknown>("/inventory", { baseUrl: serverUrl }),
      ]);
      const health = healthSchema.parse(healthRaw);
      const inventory = z.array(ingredientSchema).parse(inventoryRaw);
      setReady({
        serverOk: health.status === "ok",
        ollamaOk: health.ollama,
        ingredientCount: inventory.length,
      });
    } catch {
      setReady(defaultReady);
    }
  }, [serverUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  return { ready, refresh };
}
