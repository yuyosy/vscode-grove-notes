/**
 * Replaces date/time tokens inside a string.
 *
 * Supported tokens (must appear inside {{ }}):
 *   YYYY  – 4-digit year
 *   MM    – 2-digit month (01-12)
 *   DD    – 2-digit day (01-31)
 *   HH    – 2-digit hour 24h (00-23)
 *   mm    – 2-digit minutes (00-59)
 *   ss    – 2-digit seconds (00-59)
 *
 * Example:
 *   formatDateTokens('{{YYYY-MM-DD HH:mm}}') → '2026-04-08 14:30'
 *
 * Non-date tokens like {{title}} are left untouched.
 */
export function formatDateTokens(
  input: string,
  date: Date = new Date(),
): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const replacements: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  // Replace tokens inside {{ }}. Only replace if every character in the
  // extracted inner expression is a known token or a separator (-, :, space).
  return input.replace(/\{\{([^}]+)\}\}/g, (match, inner: string) => {
    let result = inner;
    for (const [token, value] of Object.entries(replacements)) {
      result = result.split(token).join(value);
    }
    // If the inner value still contains {} it was not a date token — skip.
    // If nothing changed and none of the tokens matched, leave the original.
    const changed = result !== inner;
    return changed ? result : match;
  });
}
