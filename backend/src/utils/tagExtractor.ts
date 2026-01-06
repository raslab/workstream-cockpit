/**
 * Extract unique tag names from text using regex
 * Pattern: #tagname (alphanumeric, hyphens, underscores)
 */
export function extractTags(text: string | null | undefined): string[] {
  if (!text) return [];

  // Match hashtags: # followed by alphanumeric, hyphens, underscores
  // \B ensures # is not preceded by a word character (avoids mid-word matches)
  const tagPattern = /\B#([a-zA-Z0-9_-]+)\b/g;
  const matches = text.matchAll(tagPattern);
  const tags = new Set<string>();

  for (const match of matches) {
    // Normalize to lowercase for consistency
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags);
}

/**
 * Extract tags from multiple text fields
 * Useful for extracting tags from workstream context + all status updates
 */
export function extractTagsFromFields(...fields: (string | null | undefined)[]): string[] {
  const allTags = new Set<string>();

  for (const field of fields) {
    if (field) {
      extractTags(field).forEach(tag => allTags.add(tag));
    }
  }

  return Array.from(allTags);
}
