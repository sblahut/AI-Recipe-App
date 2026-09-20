import { weeklyAdChainsForPicker } from "@/lib/storeChains";

describe("weeklyAdChainsForPicker", () => {
  it("includes Walmart and Aldi even without saved stores", () => {
    const chains = weeklyAdChainsForPicker([]);
    expect(chains).toContain("Walmart");
    expect(chains).toContain("Aldi");
  });

  it("dedupes saved store chains with defaults", () => {
    const chains = weeklyAdChainsForPicker([
      { chain: "Publix", name: "Publix on Main" },
    ]);
    expect(chains.filter((c) => c === "Publix")).toHaveLength(1);
  });

  it("omits Harris Teeter from the weekly ad picker", () => {
    const chains = weeklyAdChainsForPicker([
      { chain: "Harris Teeter", name: "HT on Oak" },
    ]);
    expect(chains).not.toContain("Harris Teeter");
  });
});
