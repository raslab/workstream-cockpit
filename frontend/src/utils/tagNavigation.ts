export function addTagToSearch(search: string, tagName: string): string {
  const params = new URLSearchParams(search);
  const tags = new Set(
    (params.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
  tags.add(tagName);
  params.set('tags', Array.from(tags).sort((a, b) => a.localeCompare(b)).join(','));
  return params.toString();
}

export function tagFilterDestination(pathname: string, search: string, tagName: string) {
  return {
    pathname: pathname === '/timeline' ? '/timeline' : '/',
    search: `?${addTagToSearch(search, tagName)}`,
  };
}
