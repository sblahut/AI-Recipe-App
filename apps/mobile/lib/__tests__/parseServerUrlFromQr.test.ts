import { parseServerUrlFromQr, serverUrlQrImageUri } from "@/lib/parseServerUrlFromQr";

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

  it("rejects barcodes that are not server URLs", () => {
    expect(parseServerUrlFromQr("012345678905")).toBeNull();
    expect(parseServerUrlFromQr("")).toBeNull();
  });
});

describe("serverUrlQrImageUri", () => {
  it("encodes the server URL for the QR image", () => {
    const uri = serverUrlQrImageUri("http://kitchen-pc.tail123.ts.net:8000");
    expect(uri).toContain("create-qr-code");
    expect(uri).toContain(encodeURIComponent("http://kitchen-pc.tail123.ts.net:8000"));
  });
});
