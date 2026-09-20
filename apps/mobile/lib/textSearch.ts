/** True when query is empty or any field contains the query (case-insensitive). */
export function textMatchesSearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return fields.some((field) => field?.toLowerCase().includes(q));
}
