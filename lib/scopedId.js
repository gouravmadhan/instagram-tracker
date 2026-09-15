/**
 * All snapshot/list documents are keyed as `<userId>::<key>` so every
 * signed-in Google account gets its own isolated data in the same
 * collections, without needing separate collections per user.
 */
export function scopedId(userId, key) {
  return `${userId}::${key}`;
}
