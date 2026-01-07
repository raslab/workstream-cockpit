/**
 * Extract unique tag names from text using simple word matching
 * Only extracts single-word tags: #backend, #Tech-Leads, #api_v2
 * Does NOT support multi-word tags to avoid ambiguity
 * Pattern: # followed by alphanumeric, hyphens, underscores (no spaces)
 */
export function extractTags(text: string | null | undefined): string[] {
  if (!text) return [];

  // Match hashtags: # followed by alphanumeric, hyphens, underscores (single word only)
  // \B# - hashtag not preceded by word character
  // ([a-zA-Z0-9_-]+) - tag name (no spaces)
  // \b - word boundary (stops at space, punctuation, etc.)
  const tagPattern = /\B#([a-zA-Z0-9_-]+)\b/g;
  const matches = text.matchAll(tagPattern);
  const tags = new Set<string>();

  for (const match of matches) {
    // Normalize to lowercase and trim for consistency
    const tagName = match[1].trim().toLowerCase();
    if (tagName) {
      tags.add(tagName);
    }
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
