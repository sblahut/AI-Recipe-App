const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD for form fields from API ISO timestamp. */
export function expirationInputFromIso(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "";
  }
  const head = iso.slice(0, 10);
  return DATE_ONLY.test(head) ? head : "";
}

/** API payload from YYYY-MM-DD text; null when empty. */
export function expiresAtIsoFromDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (!DATE_ONLY.test(trimmed)) {
    return null;
  }
  const parts = trimmed.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const local = new Date(year, month - 1, day);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day
  ) {
    return null;
  }
  return `${trimmed}T12:00:00.000Z`;
}

export function expiresAtIsoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T12:00:00.000Z`;
}

export function dateFromExpiresAtIso(iso: string | null | undefined): Date | null {
  const input = expirationInputFromIso(iso);
  if (!input) {
    return null;
  }
  const parts = input.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function formatExpirationLabel(iso: string | null | undefined): string | null {
  const date = dateFromExpiresAtIso(iso);
  if (!date) {
    return null;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** True when the expiration calendar day is today or in the past (local time). */
export function isExpirationDue(iso: string | null | undefined): boolean {
  const expiration = dateFromExpiresAtIso(iso);
  if (!expiration) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDay = new Date(expiration);
  expDay.setHours(0, 0, 0, 0);
  return expDay.getTime() <= today.getTime();
}

/** e.g. "expires Apr 5, 2026" or "expired Apr 5, 2026". */
export function formatIngredientExpirationPhrase(iso: string | null | undefined): string | null {
  const label = formatExpirationLabel(iso);
  if (!label) {
    return null;
  }
  const verb = isExpirationDue(iso) ? "expired" : "expires";
  return `${verb} ${label}`;
}
