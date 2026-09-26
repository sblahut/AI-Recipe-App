export function formatShoppingListCollapsibleTitle(
  listName: string,
  itemCount: number | undefined,
): string {
  if (itemCount == null) {
    return listName;
  }
  return `${listName} (${itemCount})`;
}

/** Default expanded state for shopping list collapsibles before user toggles. */
export function defaultShoppingListExpanded(
  listIndex: number,
  listCount: number,
): boolean {
  return listCount === 1 || listIndex === 0;
}
