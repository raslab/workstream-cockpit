/**
 * Extract unique hashtags from text content
 * Only extracts single-word tags: #backend, #Tech-Leads, #api_v2
 * Does NOT support multi-word tags to avoid ambiguity
 * Examples: #backend, #Tech-Leads, #api_v2
 * @param texts - Array of text strings to extract tags from
 * @returns Array of unique tag names (lowercase, without # prefix)
 */
export function extractTags(...texts: (string | null | undefined)[]): string[] {
  // Match single-word hashtags only (no spaces)
  const tagRegex = /\B#([a-zA-Z0-9_-]+)\b/g;
  const tagSet = new Set<string>();

  texts.forEach((text) => {
    if (!text) return;
    
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      // Normalize tag: lowercase and trim
      const tagName = match[1].trim().toLowerCase();
      if (tagName) {
        tagSet.add(tagName);
      }
    }
  });

  return Array.from(tagSet);
}
