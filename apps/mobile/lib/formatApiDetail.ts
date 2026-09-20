/** Turn FastAPI error bodies into a readable message. */
export function formatApiDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((entry) => {
        if (typeof entry === "object" && entry !== null && "msg" in entry) {
          const msg = (entry as { msg?: unknown }).msg;
          return typeof msg === "string" ? msg : null;
        }
        return null;
      })
      .filter((part): part is string => part != null);
    return parts.length > 0 ? parts.join("; ") : null;
  }
  return null;
}
