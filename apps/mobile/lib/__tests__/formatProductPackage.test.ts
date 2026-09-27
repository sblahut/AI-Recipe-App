import { formatProductPackage } from "@/lib/formatProductPackage";

describe("formatProductPackage", () => {
  it("formats quantity and unit", () => {
    expect(
      formatProductPackage({
        barcode: "1",
        name: "Milk",
        default_quantity: 1,
        default_unit: "l",
      }),
    ).toBe("1 l");
  });

  it("returns null when incomplete", () => {
    expect(formatProductPackage({ barcode: "1", name: "Cereal" })).toBeNull();
  });
});
