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
