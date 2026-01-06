import { extractTags, extractTagsFromFields } from '../../src/utils/tagExtractor';

describe('extractTags', () => {
  it('extracts single tag', () => {
    expect(extractTags('Working on #backend')).toEqual(['backend']);
  });

  it('extracts multiple tags', () => {
    const result = extractTags('#backend #frontend #api');
    expect(result).toHaveLength(3);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
  });

  it('removes duplicates', () => {
    expect(extractTags('#backend and #backend')).toEqual(['backend']);
  });

  it('normalizes to lowercase', () => {
    const result = extractTags('#Backend #FRONTEND #Api');
    expect(result).toHaveLength(3);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
  });

  it('handles tags with hyphens', () => {
    expect(extractTags('#backend-team')).toEqual(['backend-team']);
  });

  it('handles tags with underscores', () => {
    expect(extractTags('#api_v2')).toEqual(['api_v2']);
  });

  it('handles mixed case and special chars', () => {
    expect(extractTags('#Backend-Team_v2')).toEqual(['backend-team_v2']);
  });

  it('ignores tags in middle of words', () => {
    // email#john should not match because # is preceded by word char
    expect(extractTags('email#john@test.com')).toEqual([]);
  });

  it('matches tags after space', () => {
    expect(extractTags('Hello #world')).toEqual(['world']);
  });

  it('matches tags after punctuation', () => {
    expect(extractTags('Done! #backend')).toEqual(['backend']);
  });

  it('matches tags at start of string', () => {
    expect(extractTags('#backend is ready')).toEqual(['backend']);
  });

  it('handles empty string', () => {
    expect(extractTags('')).toEqual([]);
  });

  it('handles null', () => {
    expect(extractTags(null)).toEqual([]);
  });

  it('handles undefined', () => {
    expect(extractTags(undefined)).toEqual([]);
  });

  it('handles text without tags', () => {
    expect(extractTags('No tags here')).toEqual([]);
  });

  it('ignores invalid tag characters', () => {
    // Only alphanumeric, hyphens, underscores allowed
    // Tag stops at first invalid character
    expect(extractTags('#my@tag')).toEqual(['my']);
    expect(extractTags('#my tag')).toEqual(['my']);
  });

  it('handles tags in markdown', () => {
    const markdown = '## Header\n\nWorking on #backend and #frontend\n\n- #api\n- #database';
    const result = extractTags(markdown);
    expect(result).toHaveLength(4);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
    expect(result).toContain('database');
  });

  it('handles tags after newlines', () => {
    expect(extractTags('Line 1\n#backend\nLine 3')).toEqual(['backend']);
  });

  it('handles multiple tags on same line', () => {
    expect(extractTags('Working on #backend and #frontend today')).toEqual(['backend', 'frontend']);
  });
});

describe('extractTagsFromFields', () => {
  it('extracts tags from multiple fields', () => {
    const result = extractTagsFromFields(
      'Context with #backend',
      'Note with #frontend',
      'Another note with #api'
    );
    expect(result).toHaveLength(3);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
  });

  it('removes duplicates across fields', () => {
    const result = extractTagsFromFields(
      '#backend and #api',
      '#backend and #frontend',
      '#api'
    );
    expect(result).toHaveLength(3);
    expect(result).toContain('backend');
    expect(result).toContain('api');
    expect(result).toContain('frontend');
  });

  it('handles null and undefined fields', () => {
    const result = extractTagsFromFields(
      '#backend',
      null,
      undefined,
      '#frontend'
    );
    expect(result).toHaveLength(2);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
  });

  it('handles empty fields', () => {
    const result = extractTagsFromFields('', '#backend', '');
    expect(result).toEqual(['backend']);
  });

  it('handles all null/undefined', () => {
    const result = extractTagsFromFields(null, undefined, null);
    expect(result).toEqual([]);
  });

  it('handles no arguments', () => {
    const result = extractTagsFromFields();
    expect(result).toEqual([]);
  });

  it('preserves order of first occurrence', () => {
    const result = extractTagsFromFields(
      '#frontend #backend',
      '#api',
      '#backend' // duplicate, should not affect order
    );
    expect(result[0]).toBe('frontend');
    expect(result[1]).toBe('backend');
    expect(result[2]).toBe('api');
  });
});
