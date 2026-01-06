import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * MarkdownRenderer - Safely renders markdown content with GitHub Flavored Markdown support
 * 
 * Features:
 * - Links open in new tab with security attributes
 * - Code blocks with syntax highlighting styles
 * - Tables, strikethrough, task lists (GFM)
 * - Headings with consistent styling
 * - Custom component overrides for security and design
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const components: Components = {
    // Links: Open in new tab with security
    a: ({ ...props }) => (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 underline hover:text-primary-800"
      />
    ),
    
    // Headings: Styled hierarchy
    h1: ({ ...props }) => (
      <h1 {...props} className="mb-2 mt-4 text-xl font-bold text-gray-900" />
    ),
    h2: ({ ...props }) => (
      <h2 {...props} className="mb-2 mt-3 text-lg font-semibold text-gray-900" />
    ),
    h3: ({ ...props }) => (
      <h3 {...props} className="mb-1 mt-2 text-base font-semibold text-gray-900" />
    ),
    
    // Code: Inline and block styles
    code: ({ inline, className, children, ...props }: any) => {
      return inline ? (
        <code
          {...props}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800"
        >
          {children}
        </code>
      ) : (
        <code
          {...props}
          className="block my-2 rounded bg-gray-100 p-3 text-sm font-mono text-gray-800 overflow-x-auto"
        >
          {children}
        </code>
      );
    },
    
    // Lists: Proper spacing
    ul: ({ ...props }) => (
      <ul {...props} className="my-2 ml-6 list-disc space-y-1" />
    ),
    ol: ({ ...props }) => (
      <ol {...props} className="my-2 ml-6 list-decimal space-y-1" />
    ),
    
    // Paragraphs: Spacing
    p: ({ ...props }) => (
      <p {...props} className="my-2" />
    ),
    
    // Blockquotes: Visual distinction
    blockquote: ({ ...props }) => (
      <blockquote
        {...props}
        className="my-2 border-l-4 border-gray-300 pl-4 italic text-gray-600"
      />
    ),
    
    // Tables: Basic styling (GFM feature)
    table: ({ ...props }) => (
      <table {...props} className="my-2 min-w-full border border-gray-300" />
    ),
    th: ({ ...props }) => (
      <th {...props} className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold" />
    ),
    td: ({ ...props }) => (
      <td {...props} className="border border-gray-300 px-3 py-2" />
    ),
  };
  
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
