/** User-facing copy after adding recipe lines to pantry via bulk API. */
export function formatStockRecipeAlertMessage(lineCount: number, location: string): string {
  if (lineCount === 0) {
    return "This recipe has no ingredient lines to add. You can still add items manually on the Ingredients tab.";
  }
  return (
    `${lineCount} line${lineCount === 1 ? "" : "s"} saved to ${location}. ` +
    "Open the Ingredients tab and pull to refresh if you do not see them yet. " +
    'Optional: scan barcodes for packaged goods — "Done" keeps what was already saved.'
  );
}
