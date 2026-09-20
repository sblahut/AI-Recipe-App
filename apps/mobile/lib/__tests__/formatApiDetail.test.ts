import { formatApiDetail } from "@/lib/formatApiDetail";

describe("formatApiDetail", () => {
  it("returns string detail", () => {
    expect(formatApiDetail("Not found")).toBe("Not found");
  });

  it("joins validation error arrays", () => {
    expect(formatApiDetail([{ msg: "field required" }, { msg: "invalid type" }])).toBe(
      "field required; invalid type",
    );
  });
});
