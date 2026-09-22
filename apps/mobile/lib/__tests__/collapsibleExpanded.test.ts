import { isCollapsibleExpanded } from "@/lib/collapsibleExpanded";

describe("isCollapsibleExpanded", () => {
  it("uses default when id is not in map", () => {
    expect(isCollapsibleExpanded("Fridge", {}, true)).toBe(true);
    expect(isCollapsibleExpanded("Fridge", {}, false)).toBe(false);
  });

  it("uses explicit map value when present", () => {
    expect(isCollapsibleExpanded("Fridge", { Fridge: false }, true)).toBe(false);
    expect(isCollapsibleExpanded("Fridge", { Fridge: true }, false)).toBe(true);
  });

  it("works with numeric ids", () => {
    expect(isCollapsibleExpanded(42, { 42: true }, false)).toBe(true);
  });
});
