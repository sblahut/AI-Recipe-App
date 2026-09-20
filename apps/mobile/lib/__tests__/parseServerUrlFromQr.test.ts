import {
  canShowHomeServerQr,
  parseServerUrlFromQr,
  phoneUnreachableHomeServerReason,
  serverUrlQrImageUri,
} from "@/lib/parseServerUrlFromQr";

describe("parseServerUrlFromQr", () => {
  it("accepts a plain HTTP API URL", () => {
    expect(parseServerUrlFromQr("http://kitchen-pc.tail123.ts.net:8000/")).toBe(
      "http://kitchen-pc.tail123.ts.net:8000",
    );
  });

  it("reads server from an app deep link", () => {
    expect(
      parseServerUrlFromQr(
        "airecipe://connect?server=http%3A%2F%2F192.168.1.50%3A8000",
      ),
    ).toBe("http://192.168.1.50:8000");
  });

  it("adds http:// to a host:port payload", () => {
    expect(parseServerUrlFromQr("192.168.1.50:8000")).toBe("http://192.168.1.50:8000");
  });

  it("rejects barcodes that are not server URLs", () => {
    expect(parseServerUrlFromQr("012345678905")).toBeNull();
    expect(parseServerUrlFromQr("")).toBeNull();
  });
});

describe("phoneUnreachableHomeServerReason", () => {
  it("rejects loopback and Expo Metro port", () => {
    expect(phoneUnreachableHomeServerReason("http://127.0.0.1:8000")).toMatch(/not your PC/);
    expect(phoneUnreachableHomeServerReason("http://localhost:8081")).toMatch(/8081/);
    expect(phoneUnreachableHomeServerReason("http://192.168.1.50:8000")).toBeNull();
  });

  it("hides QR for loopback addresses", () => {
    expect(canShowHomeServerQr("http://127.0.0.1:8000")).toBe(false);
    expect(canShowHomeServerQr("http://kitchen-pc.tail123.ts.net:8000")).toBe(true);
  });
});

describe("serverUrlQrImageUri", () => {
  it("encodes the server URL for the QR image", () => {
    const uri = serverUrlQrImageUri("http://kitchen-pc.tail123.ts.net:8000");
    expect(uri).toContain("create-qr-code");
    expect(uri).toContain(encodeURIComponent("http://kitchen-pc.tail123.ts.net:8000"));
  });
});
