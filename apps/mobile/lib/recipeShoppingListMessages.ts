export function shoppingListResultMessage(
  listName: string,
  added: number,
  skippedInIngredients: number,
): { title: string; message: string } {
  if (added > 0) {
    const message =
      skippedInIngredients > 0
        ? `${added} item${added === 1 ? "" : "s"} added to "${listName}". ${skippedInIngredients} already on your ingredients list.`
        : `${added} item${added === 1 ? "" : "s"} added to "${listName}".`;
    return { title: "Shopping list updated", message };
  }
  if (skippedInIngredients > 0) {
    return {
      title: "Already stocked",
      message: `Everything for this recipe is already on your ingredients list — nothing added to "${listName}".`,
    };
  }
  return {
    title: "Nothing to add",
    message: "This recipe has no ingredient lines to add to the shopping list.",
  };
}
