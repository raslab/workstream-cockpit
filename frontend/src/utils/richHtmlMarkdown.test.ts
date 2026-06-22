import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, insertMarkdownAtSelection } from './richHtmlMarkdown';

describe('htmlToMarkdown', () => {
  it('converts common rich HTML formatting to Markdown', () => {
    const html = `
      <h2>Project <em>Plan</em></h2>
      <p><strong>Done:</strong> shipped <a href="https://example.com?a=1&b=2">docs</a><br>Next line</p>
      <blockquote><p>quoted <code>value</code></p></blockquote>
      <script>alert('xss')</script>
    `;

    expect(htmlToMarkdown(html)).toBe([
      '## Project *Plan*',
      '',
      '**Done:** shipped [docs](https://example.com?a=1&b=2)',
      'Next line',
      '',
      '> quoted `value`',
    ].join('\n'));
  });

  it('converts nested ordered and unordered lists tolerably', () => {
    const html = `
      <ol>
        <li>First</li>
        <li>Second<ul><li>Nested <b>item</b></li></ul></li>
      </ol>
    `;

    expect(htmlToMarkdown(html)).toBe([
      '1. First',
      '2. Second',
      '   - Nested **item**',
    ].join('\n'));
  });

  it('uses decoded text content, converts common inline CSS font styles, and never preserves raw html', () => {
    expect(
      htmlToMarkdown(
        '<p><span style="font-weight: 700">A &amp; B</span> <span style="font-style: italic">C</span> <img src=x onerror=y alt="bad"></p>'
      )
    ).toBe('**A & B** *C* bad');
  });

  it('keeps emoji and image alt text from rich browser paste', () => {
    expect(
      htmlToMarkdown(
        '<p>Ship it <img class="emoji" alt="🚀" src="rocket.png"> <img alt="Architecture diagram" src="diagram.png"> <img alt="" src="decorative.png"></p>'
      )
    ).toBe('Ship it 🚀 Architecture diagram');
  });
  it('converts block and link CSS font styles commonly produced by browser copy', () => {
    expect(
      htmlToMarkdown(
        '<p style="font-weight: 700">Bold paragraph</p><div style="font-style: italic">Italic div</div><a style="font-weight: bold" href="https://example.com">Link</a>'
      )
    ).toBe(['**Bold paragraph**', '', '*Italic div*', '', '**[Link](https://example.com)**'].join('\n'));
  });

  it('drops unsafe hyperlink protocols while keeping link text', () => {
    expect(htmlToMarkdown('<p><a href="javascript:alert(1)">Unsafe link</a></p>')).toBe('Unsafe link');
  });
});

describe('insertMarkdownAtSelection', () => {
  it('replaces the selection and respects maxLength', () => {
    expect(insertMarkdownAtSelection('hello old world', '**new**', 6, 9, 16)).toEqual({
      value: 'hello **new** wo',
      selectionStart: 13,
      selectionEnd: 13,
    });
  });
});
