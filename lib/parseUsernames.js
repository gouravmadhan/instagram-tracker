/**
 * Accepts a single username, a comma/newline/space separated blob of many,
 * or an array of either, and returns a clean, deduped array of usernames
 * with leading "@" stripped and empty entries removed.
 */
export function parseUsernameList(input) {
  let text = input;
  if (Array.isArray(text)) text = text.join(',');
  if (typeof text !== 'string') return [];

  const seen = new Set();
  const result = [];
  for (const raw of text.split(/[\s,]+/)) {
    const clean = raw.trim().replace(/^@/, '');
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  return result;
}
