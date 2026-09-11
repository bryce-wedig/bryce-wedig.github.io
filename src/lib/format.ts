const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-08-03" → "Aug 3, 2026". Fixed to UTC so date-only values don't shift. */
export function formatDate(value: string): string {
  return formatter.format(new Date(value));
}
