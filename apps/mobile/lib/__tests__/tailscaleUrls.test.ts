import {
  dedicatedTailscaleHttpUrl,
  dedicatedTailscaleHttpsUrl,
  isTailscaleDedicatedHost,
  normalizeTailscaleDnsName,
} from "@/lib/tailscaleUrls";

describe("tailscaleUrls", () => {
  it("strips trailing dots from MagicDNS names", () => {
    expect(normalizeTailscaleDnsName("kitchen-pc.tail123.ts.net.")).toBe(
      "kitchen-pc.tail123.ts.net",
    );
  });

  it("builds the dedicated HTTP API URL for Settings", () => {
    expect(dedicatedTailscaleHttpUrl("kitchen-pc.tail123.ts.net.")).toBe(
      "http://kitchen-pc.tail123.ts.net:8000",
    );
  });

  it("builds the HTTPS Serve URL without a port", () => {
    expect(dedicatedTailscaleHttpsUrl("kitchen-pc.tail123.ts.net.")).toBe(
      "https://kitchen-pc.tail123.ts.net",
    );
  });

  it("recognizes ts.net dedicated hosts", () => {
    expect(isTailscaleDedicatedHost("kitchen-pc.tail123.ts.net")).toBe(true);
    expect(isTailscaleDedicatedHost("192.168.1.50")).toBe(false);
  });
});
