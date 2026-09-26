import { formatFilteredSectionTitle } from "@/lib/recipeSectionTitle";

describe("formatFilteredSectionTitle", () => {
  it("shows total count when search is empty", () => {
    expect(formatFilteredSectionTitle("Family favorites", 7, 7, "")).toBe(
      "Family favorites (7)",
    );
  });

  it("shows total count when search matches all rows", () => {
    expect(formatFilteredSectionTitle("Recipe ideas", 5, 5, "pasta")).toBe("Recipe ideas (5)");
  });

  it("shows visible of total when search narrows results", () => {
    expect(formatFilteredSectionTitle("Family favorites", 7, 2, "soup")).toBe(
      "Family favorites (2 of 7)",
    );
  });

  it("ignores whitespace-only search for of/total formatting", () => {
    expect(formatFilteredSectionTitle("Fridge", 4, 2, "   ")).toBe("Fridge (4)");
  });
});
