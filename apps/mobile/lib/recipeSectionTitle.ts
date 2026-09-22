/** Section header for recipe lists when search may narrow visible rows. */
export function formatFilteredSectionTitle(
  baseLabel: string,
  totalCount: number,
  visibleCount: number,
  searchQuery: string,
): string {
  if (searchQuery.trim() && visibleCount !== totalCount) {
    return `${baseLabel} (${visibleCount} of ${totalCount})`;
  }
  return `${baseLabel} (${totalCount})`;
}
