import {
  chefFeaturesAvailable,
  homeServerHeaderStatus,
  homeServerReadyFromHealth,
  homeServerStatusLines,
} from "@/lib/homeServerReady";

describe("homeServerReadyFromHealth", () => {
  it("marks server ok when status is ok", () => {
    expect(
      homeServerReadyFromHealth({ status: "ok", ollama: true }, 4).serverOk,
    ).toBe(true);
  });

  it("passes through ollama and ingredient count", () => {
    expect(homeServerReadyFromHealth({ status: "ok", ollama: false }, 0)).toEqual({
      serverOk: true,
      ollamaOk: false,
      ingredientCount: 0,
    });
  });
});

describe("homeServerStatusLines", () => {
  it("returns three status lines with expected labels when healthy", () => {
    const lines = homeServerStatusLines({
      serverOk: true,
      ollamaOk: true,
      ingredientCount: 4,
    });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ ok: true, label: "Home server connected" });
    expect(lines[1]).toEqual({ ok: true, label: "AI model ready" });
    expect(lines[2]).toEqual({ ok: true, label: "4 ingredients available" });
  });

  it("uses singular ingredient label", () => {
    const lines = homeServerStatusLines({
      serverOk: true,
      ollamaOk: true,
      ingredientCount: 1,
    });
    expect(lines[2]?.label).toBe("1 ingredient available");
  });

  it("handles unknown ollama status", () => {
    const lines = homeServerStatusLines({
      serverOk: false,
      ollamaOk: null,
      ingredientCount: 0,
    });
    expect(lines[0]?.ok).toBe(false);
    expect(lines[1]?.label).toBe("AI model status unknown");
    expect(lines[2]?.label).toBe("Add ingredients on the Pantry tab");
  });
});

describe("homeServerHeaderStatus", () => {
  it("marks a healthy server and Ollama as ok", () => {
    expect(
      homeServerHeaderStatus({ serverOk: true, ollamaOk: true, ingredientCount: 2 }),
    ).toEqual({ tone: "ok", accessibilityLabel: "Home server connected" });
  });

  it("uses server_down when the API is unreachable", () => {
    expect(
      homeServerHeaderStatus({ serverOk: false, ollamaOk: null, ingredientCount: 0 }),
    ).toEqual({ tone: "server_down", accessibilityLabel: "Home server offline" });
  });

  it("uses ollama_down when the API is up but the model is not", () => {
    expect(
      homeServerHeaderStatus({ serverOk: true, ollamaOk: false, ingredientCount: 3 }),
    ).toEqual({ tone: "ollama_down", accessibilityLabel: "Ollama offline" });
  });
});

describe("chefFeaturesAvailable", () => {
  it("is true only when the server is up and Ollama is not explicitly down", () => {
    expect(chefFeaturesAvailable({ serverOk: true, ollamaOk: true, ingredientCount: 1 })).toBe(
      true,
    );
    expect(chefFeaturesAvailable({ serverOk: true, ollamaOk: null, ingredientCount: 1 })).toBe(
      true,
    );
    expect(chefFeaturesAvailable({ serverOk: true, ollamaOk: false, ingredientCount: 1 })).toBe(
      false,
    );
    expect(chefFeaturesAvailable({ serverOk: false, ollamaOk: true, ingredientCount: 1 })).toBe(
      false,
    );
  });
});
