import { formatStockRecipeAlertMessage } from "@/lib/formatStockRecipeAlert";

describe("formatStockRecipeAlertMessage", () => {
  it("explains zero lines", () => {
    expect(formatStockRecipeAlertMessage(0, "Pantry")).toContain("no ingredient lines");
  });

  it("mentions refresh and Done for successful adds", () => {
    const msg = formatStockRecipeAlertMessage(3, "Fridge");
    expect(msg).toContain("3 lines saved to Fridge");
    expect(msg).toContain("pull to refresh");
    expect(msg).toContain("Done");
  });
});
