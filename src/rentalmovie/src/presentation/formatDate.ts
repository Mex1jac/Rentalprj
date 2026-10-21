/**
 * Compact locale date for tables: JSON datetimes arrive as ISO strings and
 * the operator only needs the calendar day.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}
