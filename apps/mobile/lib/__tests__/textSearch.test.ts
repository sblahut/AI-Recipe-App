import { textMatchesSearch } from "@/lib/textSearch";

describe("textMatchesSearch", () => {
  it("matches when query is empty", () => {
    expect(textMatchesSearch("", "anything")).toBe(true);
    expect(textMatchesSearch("   ", "anything")).toBe(true);
  });

  it("matches case-insensitive substring in any field", () => {
    expect(textMatchesSearch("garlic", "Fresh Garlic")).toBe(true);
    expect(textMatchesSearch("PAN", undefined, "Pantry")).toBe(true);
  });

  it("returns false when no field matches", () => {
    expect(textMatchesSearch("saffron", "salt", "pepper")).toBe(false);
  });
});
