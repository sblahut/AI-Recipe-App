/** Normalize MagicDNS names from `tailscale status` (often trailing dot). */
export function normalizeTailscaleDnsName(dnsName: string): string {
  return dnsName.trim().replace(/\.+$/, "").toLowerCase();
}

/** HTTP API URL on the tailnet (works after iOS ATS allows ts.net). */
export function dedicatedTailscaleHttpUrl(dnsName: string, port = 8000): string {
  const host = normalizeTailscaleDnsName(dnsName);
  if (!host) {
    throw new Error("Tailscale DNS name is empty");
  }
  return `http://${host}:${port}`;
}

/** HTTPS name after `tailscale serve` on port 443. */
export function dedicatedTailscaleHttpsUrl(dnsName: string): string {
  const host = normalizeTailscaleDnsName(dnsName);
  if (!host) {
    throw new Error("Tailscale DNS name is empty");
  }
  return `https://${host}`;
}

export function isTailscaleDedicatedHost(host: string): boolean {
  const normalized = normalizeTailscaleDnsName(host);
  return normalized.endsWith(".ts.net");
}
