/** Resolved expand/collapse state when map may omit ids (use default until toggled). */
export function isCollapsibleExpanded(
  id: string | number,
  expandedMap: Partial<Record<string | number, boolean>>,
  defaultExpanded: boolean,
): boolean {
  if (id in expandedMap) {
    return expandedMap[id] ?? false;
  }
  return defaultExpanded;
}
