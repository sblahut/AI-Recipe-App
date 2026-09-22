import {
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
