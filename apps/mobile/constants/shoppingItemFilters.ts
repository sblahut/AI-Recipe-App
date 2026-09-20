export type ShoppingItemFilter = "All" | "To buy" | "In cart";

export const SHOPPING_ITEM_FILTERS: {
  id: ShoppingItemFilter;
  label: string;
  icon: "layers-outline" | "cart-outline" | "checkmark-circle-outline";
}[] = [
  { id: "All", label: "All items", icon: "layers-outline" },
  { id: "To buy", label: "Still to buy", icon: "cart-outline" },
  { id: "In cart", label: "In cart", icon: "checkmark-circle-outline" },
];
