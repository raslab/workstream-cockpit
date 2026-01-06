/**
 * Extract unique hashtags from text content
 * @param texts - Array of text strings to extract tags from
 * @returns Array of unique tag names (lowercase, without # prefix)
 */
export function extractTags(...texts: (string | null | undefined)[]): string[] {
  const tagRegex = /\B#([a-zA-Z0-9_-]+)\b/g;
  const tagSet = new Set<string>();

  texts.forEach((text) => {
    if (!text) return;
    
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      tagSet.add(match[1].toLowerCase());
    }
  });

  return Array.from(tagSet);
}
