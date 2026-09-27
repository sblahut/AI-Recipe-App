export type HomeServerReady = {
  serverOk: boolean;
  ollamaOk: boolean | null;
  ingredientCount: number;
};

export const defaultHomeServerReady: HomeServerReady = {
  serverOk: false,
  ollamaOk: null,
  ingredientCount: 0,
};

export function homeServerReadyFromHealth(
  health: { status: string; ollama: boolean },
  ingredientCount: number,
): HomeServerReady {
  return {
    serverOk: health.status === "ok",
    ollamaOk: health.ollama,
    ingredientCount,
  };
}

export type HomeServerHeaderTone = "ok" | "ollama_down" | "server_down";

export type HomeServerHeaderStatus = {
  tone: HomeServerHeaderTone;
  accessibilityLabel: string;
};

/** Compact header-dot state for Settings / home-server health. */
export function homeServerHeaderStatus(ready: HomeServerReady): HomeServerHeaderStatus {
  if (!ready.serverOk) {
    return { tone: "server_down", accessibilityLabel: "Home server offline" };
  }
  if (ready.ollamaOk === false) {
    return { tone: "ollama_down", accessibilityLabel: "Ollama offline" };
  }
  if (ready.ollamaOk == null) {
    return { tone: "ollama_down", accessibilityLabel: "AI model status unknown" };
  }
  return { tone: "ok", accessibilityLabel: "Home server connected" };
}

/** Chef / generate need the API and a reachable Ollama process. */
export function chefFeaturesAvailable(ready: HomeServerReady): boolean {
  return ready.serverOk && ready.ollamaOk !== false;
}

export type HomeServerStatusLine = { ok: boolean; label: string };

export function homeServerStatusLines(ready: HomeServerReady): HomeServerStatusLine[] {
  return [
    {
      ok: ready.serverOk,
      label: ready.serverOk ? "Home server connected" : "Home server offline",
    },
    {
      ok: ready.ollamaOk === true,
      label:
        ready.ollamaOk === true
          ? "AI model ready"
          : ready.ollamaOk === false
            ? "AI model offline"
            : "AI model status unknown",
    },
    {
      ok: ready.ingredientCount > 0,
      label:
        ready.ingredientCount > 0
          ? `${ready.ingredientCount} ingredient${ready.ingredientCount === 1 ? "" : "s"} available`
          : "Add ingredients on the Pantry tab",
    },
  ];
}
