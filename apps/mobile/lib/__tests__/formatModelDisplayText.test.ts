import { formatModelDisplayText } from "@/lib/formatModelDisplayText";

describe("formatModelDisplayText", () => {
  it("unescapes newlines and strips bold markdown", () => {
    expect(formatModelDisplayText("**Soup**\\nTwo servings")).toBe("Soup\nTwo servings");
  });
});
