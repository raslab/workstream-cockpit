import type { ClipboardEvent } from 'react';
import { getClipboardHtml, htmlToMarkdown, insertMarkdownAtSelection } from './richHtmlMarkdown';

export function handleRichHtmlTextareaPaste(
  event: ClipboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  onChange: (value: string) => void,
  maxLength?: number
): boolean {
  const html = getClipboardHtml(event.clipboardData);
  if (!html) return false;

  const markdown = htmlToMarkdown(html);
  if (!markdown) return false;

  event.preventDefault();

  const textarea = event.currentTarget;
  const result = insertMarkdownAtSelection(
    currentValue,
    markdown,
    textarea.selectionStart ?? currentValue.length,
    textarea.selectionEnd ?? currentValue.length,
    maxLength
  );

  onChange(result.value);

  window.setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  }, 0);

  return true;
}
