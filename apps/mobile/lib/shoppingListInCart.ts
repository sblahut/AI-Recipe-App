import type { ShoppingListItem } from "@/lib/schemas";

/** Shopping list lines marked in cart (checked). */
export function shoppingListItemsInCart(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.filter((line) => line.checked);
}
