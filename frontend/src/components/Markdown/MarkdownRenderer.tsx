import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useTags } from '../../api/tags';
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Component to render a hashtag with its configured color
 * tagName is the tag ID (e.g., "alan_awake")
 */
function HashtagSpan({ tagName }: { tagName: string }) {
  const { data: tags } = useTags();
  const navigate = useNavigate();
  // tagName is the tag ID, find tag to get displayName and color
  const tag = tags?.find(t => t.name.toLowerCase() === tagName.toLowerCase());
  
  const color = tag?.color || '#1DA1F2'; // Default Twitter blue
  const displayName = tag?.displayName || tagName;  // Fallback to ID if tag not found
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to cockpit with this tag filter active (using tag ID)
    navigate('/', { state: { filterTags: [tagName] } });
  };
  
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white mx-0.5 hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
      title={`Tag ID: #${tagName}`}
    >
      #{displayName}
    </button>
  );
}

/**
 * Preprocess content to convert #hashtags into special format that we can detect
 * Only matches single-word tags: #backend, #Tech-Leads, #api_v2
 * Does NOT support multi-word tags to avoid ambiguity
 */
function preprocessHashtags(content: string): string {
  // Match single-word hashtags only
  const hashtagRegex = /\B#([a-zA-Z0-9_-]+)\b/g;
  
  // Replace with a special marker that won't be interpreted as markdown
  // We'll use a unique format: <<<HASHTAG:tagname>>>
  return content.replace(hashtagRegex, (_match, tagName) => {
    return `<<<HASHTAG:${tagName.trim()}>>>`;
  });
}

/**
 * Post-process text nodes to render hashtags
 * Works recursively on children to handle all text nodes, including nested React elements
 */
function renderTextWithHashtags(children: any): React.ReactNode {
  if (typeof children === 'string') {
    const parts: React.ReactNode[] = [];
    const hashtagPlaceholderRegex = /<<<HASHTAG:([^>]+)>>>/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = hashtagPlaceholderRegex.exec(children)) !== null) {
      // Add text before the hashtag
      if (match.index > lastIndex) {
        parts.push(children.slice(lastIndex, match.index));
      }
      
      // Add the hashtag component
      const tagName = match[1];
      parts.push(<HashtagSpan key={`${match.index}-${tagName}`} tagName={tagName} />);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < children.length) {
      parts.push(children.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : children;
  }
  
  // If children is an array, process each child recursively
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === 'string') {
        return <span key={index}>{renderTextWithHashtags(child)}</span>;
      }
      // If child is a React element, clone it and process its children
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<any>;
        if (element.props?.children) {
          return React.cloneElement(element, {
            key: index,
            children: renderTextWithHashtags(element.props.children),
          });
        }
      }
      return child;
    });
  }
  
  // If it's a React element, clone it and process its children
  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<any>;
    if (element.props?.children) {
      return React.cloneElement(element, {
        children: renderTextWithHashtags(element.props.children),
      });
    }
  }
  
  return children;
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
 * - Hashtag rendering with colors (#tagname)
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Preprocess content to protect hashtags from markdown interpretation
  const processedContent = preprocessHashtags(content);
  
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
    
    // Paragraphs: Spacing + hashtag rendering
    p: ({ children, ...props }) => (
      <p {...props} className="my-2">
        {renderTextWithHashtags(children)}
      </p>
    ),
    
    // Blockquotes: Visual distinction + hashtag rendering
    blockquote: ({ children, ...props }) => (
      <blockquote
        {...props}
        className="my-2 border-l-4 border-gray-300 pl-4 italic text-gray-600"
      >
        {renderTextWithHashtags(children)}
      </blockquote>
    ),
    
    // Tables: Basic styling (GFM feature)
    table: ({ ...props }) => (
      <table {...props} className="my-2 min-w-full border border-gray-300" />
    ),
    th: ({ ...props }) => (
      <th {...props} className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold" />
    ),
    td: ({ children, ...props }) => (
      <td {...props} className="border border-gray-300 px-3 py-2">
        {renderTextWithHashtags(children)}
      </td>
    ),
    
    // List items: hashtag rendering
    li: ({ children, ...props }) => (
      <li {...props}>
        {renderTextWithHashtags(children)}
      </li>
    ),
    
    // Emphasis/Strong: hashtag rendering
    em: ({ children, ...props }) => (
      <em {...props}>
        {renderTextWithHashtags(children)}
      </em>
    ),
    strong: ({ children, ...props }) => (
      <strong {...props}>
        {renderTextWithHashtags(children)}
      </strong>
    ),
  };
  
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
