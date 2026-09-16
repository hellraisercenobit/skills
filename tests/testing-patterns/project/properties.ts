export function canonicalTags(tags: readonly string[]): string[] {
  return [...new Set(tags)].sort();
}
