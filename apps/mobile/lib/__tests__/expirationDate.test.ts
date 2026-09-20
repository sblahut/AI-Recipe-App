import {
  dateFromExpiresAtIso,
  expirationInputFromIso,
  expiresAtIsoFromDate,
  expiresAtIsoFromDateInput,
  formatIngredientExpirationPhrase,
  isExpirationDue,
} from "@/lib/expirationDate";

describe("expirationInputFromIso", () => {
  it("extracts YYYY-MM-DD from ISO timestamp", () => {
    expect(expirationInputFromIso("2026-04-05T18:00:00.000Z")).toBe("2026-04-05");
  });

  it("returns empty for missing or invalid", () => {
    expect(expirationInputFromIso(null)).toBe("");
    expect(expirationInputFromIso("not-a-date")).toBe("");
  });
});

describe("expiresAtIsoFromDateInput", () => {
  it("builds noon UTC ISO from valid date", () => {
    expect(expiresAtIsoFromDateInput("2026-04-05")).toBe("2026-04-05T12:00:00.000Z");
  });

  it("rejects invalid calendar dates", () => {
    expect(expiresAtIsoFromDateInput("")).toBeNull();
    expect(expiresAtIsoFromDateInput("2026-02-30")).toBeNull();
    expect(expiresAtIsoFromDateInput("04-05-2026")).toBeNull();
  });
});

describe("expiresAtIsoFromDate", () => {
  it("uses local calendar day", () => {
    const iso = expiresAtIsoFromDate(new Date(2026, 3, 5));
    expect(iso).toBe("2026-04-05T12:00:00.000Z");
  });
});

describe("dateFromExpiresAtIso", () => {
  it("round-trips with date input helpers", () => {
    const date = dateFromExpiresAtIso("2026-04-05T12:00:00.000Z");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(3);
    expect(date?.getDate()).toBe(5);
  });
});

describe("isExpirationDue", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("is true when expiration day is before today", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10));
    expect(isExpirationDue("2026-06-01T12:00:00.000Z")).toBe(true);
  });

  it("is false when expiration is in the future", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10));
    expect(isExpirationDue("2026-12-31T12:00:00.000Z")).toBe(false);
  });
});

describe("formatIngredientExpirationPhrase", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses expired vs expires based on date", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10));
    const past = formatIngredientExpirationPhrase("2026-01-15T12:00:00.000Z");
    const future = formatIngredientExpirationPhrase("2026-12-15T12:00:00.000Z");
    expect(past).toMatch(/^expired /);
    expect(future).toMatch(/^expires /);
  });
});
