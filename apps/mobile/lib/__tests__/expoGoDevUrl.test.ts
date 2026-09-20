import {
  expoGoDisplayUrl,
  expoGoProjectUrlFromHost,
  qrCodeImageUri,
} from "@/lib/expoGoDevUrl";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { hostUri: "localhost:8081" },
  },
}));

describe("expoGoProjectUrlFromHost", () => {
  it("uses LAN hostUri when not loopback", () => {
    expect(expoGoProjectUrlFromHost("192.168.1.50:8081", null)).toBe("exp://192.168.1.50:8081");
  });

  it("uses lanHost when hostUri is localhost (PC web preview)", () => {
    expect(expoGoProjectUrlFromHost("localhost:8081", "192.168.1.50")).toBe(
      "exp://192.168.1.50:8081",
    );
  });

  it("builds from lanHost alone", () => {
    expect(expoGoProjectUrlFromHost(null, "192.168.1.50")).toBe("exp://192.168.1.50:8081");
  });
});

describe("expoGoDisplayUrl", () => {
  it("falls back to lanHost for localhost Metro", () => {
    expect(expoGoDisplayUrl("192.168.1.50")).toBe("exp://192.168.1.50:8081");
  });
});

describe("qrCodeImageUri", () => {
  it("builds a QR image URI", () => {
    expect(qrCodeImageUri("exp://192.168.1.50:8081")).toContain("create-qr-code");
  });
});
