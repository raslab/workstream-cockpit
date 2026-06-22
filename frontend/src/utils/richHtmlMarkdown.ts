export interface InsertMarkdownResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface MarkdownContext {
  listDepth: number;
  inPre?: boolean;
}

const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV',
  'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'UL',
]);

const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS']);

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const withoutTrailing = line.replace(/[ \t]+$/g, '');
      return /^\s+(?:[-*+] |\d+\. )/.test(withoutTrailing) ? withoutTrailing : withoutTrailing.trimStart();
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textNodeToMarkdown(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function processChildren(node: Node, context: MarkdownContext): string {
  return Array.from(node.childNodes).map((child) => processNode(child, context)).join('');
}

function hasBoldStyle(element: Element): boolean {
  const style = element.getAttribute('style') ?? '';
  const fontWeight = /font-weight\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim().toLowerCase();
  if (!fontWeight) return false;
  if (['bold', 'bolder'].includes(fontWeight)) return true;
  const numericWeight = Number(fontWeight.match(/\d+/)?.[0]);
  return Number.isFinite(numericWeight) && numericWeight >= 600;
}

function hasItalicStyle(element: Element): boolean {
  const style = element.getAttribute('style') ?? '';
  return /font-style\s*:\s*italic/i.test(style);
}

function applyInlineStyleMarkdown(element: Element, content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const hasStyle = hasItalicStyle(element) || hasBoldStyle(element);
  if (!hasStyle) return trimmed;

  let markdown = trimmed;
  if (hasItalicStyle(element)) markdown = `*${markdown}*`;
  if (hasBoldStyle(element)) markdown = `**${markdown}**`;
  return markdown;
}

function safeMarkdownHref(href: string): string {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed.replace(/[()\s]/g, encodeURIComponent);
  return '';
}

function processInlineChildrenExceptNestedLists(node: Element, context: MarkdownContext): string {
  return Array.from(node.childNodes)
    .filter((child) => !(child.nodeType === Node.ELEMENT_NODE && ['UL', 'OL'].includes((child as Element).tagName)))
    .map((child) => processNode(child, context))
    .join('')
    .trim();
}

function processNestedLists(node: Element, context: MarkdownContext): string {
  return Array.from(node.childNodes)
    .filter((child) => child.nodeType === Node.ELEMENT_NODE && ['UL', 'OL'].includes((child as Element).tagName))
    .map((child) => processList(child as Element, { ...context, listDepth: context.listDepth + 1 }))
    .join('');
}

function processList(list: Element, context: MarkdownContext): string {
  const ordered = list.tagName === 'OL';
  const items = Array.from(list.children).filter((child) => child.tagName === 'LI');

  return items
    .map((item, index) => {
      const indent = '   '.repeat(context.listDepth);
      const marker = ordered ? `${index + 1}. ` : '- ';
      const inline = applyInlineStyleMarkdown(item, processInlineChildrenExceptNestedLists(item, context));
      const nested = processNestedLists(item, context);
      return `${indent}${marker}${inline}${nested ? `\n${nested.replace(/\n$/, '')}` : ''}`;
    })
    .join('\n') + (context.listDepth === 0 ? '\n\n' : '\n');
}

function processNode(node: Node, context: MarkdownContext): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return textNodeToMarkdown(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as Element;
  const tagName = element.tagName;

  if (IGNORED_TAGS.has(tagName)) return '';

  switch (tagName) {
    case 'BR':
      return '\n';
    case 'STRONG':
    case 'B': {
      const content = processChildren(element, context).trim();
      return content ? `**${content}**` : '';
    }
    case 'EM':
    case 'I': {
      const content = processChildren(element, context).trim();
      return content ? `*${content}*` : '';
    }
    case 'S':
    case 'DEL':
    case 'STRIKE': {
      const content = processChildren(element, context).trim();
      return content ? `~~${content}~~` : '';
    }
    case 'A': {
      const content = processChildren(element, context).trim();
      const href = element.getAttribute('href')?.trim();
      if (!content) return '';
      const safeHref = href ? safeMarkdownHref(href) : '';
      const markdown = safeHref ? `[${content}](${safeHref})` : content;
      return applyInlineStyleMarkdown(element, markdown);
    }
    case 'IMG': {
      return textNodeToMarkdown(element.getAttribute('alt') ?? '').trim();
    }
    case 'CODE': {
      const content = element.textContent ?? '';
      return context.inPre ? content : (content.trim() ? `\`${content.trim()}\`` : '');
    }
    case 'PRE': {
      const content = (element.textContent ?? '').replace(/^\n+|\n+$/g, '');
      return content ? `\n\n\`\`\`\n${content}\n\`\`\`\n\n` : '';
    }
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      const level = Number(tagName.slice(1));
      const content = applyInlineStyleMarkdown(element, processChildren(element, context));
      return content ? `${'#'.repeat(level)} ${content}\n\n` : '';
    }
    case 'P':
    case 'DIV': {
      const content = applyInlineStyleMarkdown(element, processChildren(element, context));
      return content ? `${content}\n\n` : '';
    }
    case 'BLOCKQUOTE': {
      const content = normalizeMarkdown(processChildren(element, context));
      return content ? `${content.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')}\n\n` : '';
    }
    case 'UL':
    case 'OL':
      return processList(element, context);
    case 'LI':
      return processInlineChildrenExceptNestedLists(element, context);
    default: {
      const content = processChildren(element, context);
      const styledContent = (hasItalicStyle(element) || hasBoldStyle(element)) ? applyInlineStyleMarkdown(element, content) : '';
      if (styledContent) return styledContent;
      if (BLOCK_TAGS.has(tagName)) return content.trim() ? `${content.trim()}\n\n` : '';
      return content;
    }
  }
}

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return normalizeMarkdown(processChildren(doc.body, { listDepth: 0 }));
}

export function insertMarkdownAtSelection(
  currentValue: string,
  markdown: string,
  selectionStart: number,
  selectionEnd: number,
  maxLength?: number
): InsertMarkdownResult {
  const before = currentValue.slice(0, selectionStart);
  const after = currentValue.slice(selectionEnd);
  const nextValue = `${before}${markdown}${after}`;
  const value = typeof maxLength === 'number' ? nextValue.slice(0, maxLength) : nextValue;
  const nextSelection = Math.min(before.length + markdown.length, value.length);

  return {
    value,
    selectionStart: nextSelection,
    selectionEnd: nextSelection,
  };
}

export function getClipboardHtml(clipboardData: DataTransfer | null): string {
  if (!clipboardData) return '';
  const types = Array.from(clipboardData.types ?? []);
  if (!types.includes('text/html')) return '';
  return clipboardData.getData('text/html');
}
