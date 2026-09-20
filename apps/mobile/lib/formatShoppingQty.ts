import type { ShoppingListItem } from "@/lib/schemas";

export function formatShoppingQty(item: ShoppingListItem): string {
  if (item.quantity == null) {
    return "No quantity set";
  }
  return `${item.quantity} ${item.unit ?? ""}`.trim();
}
