import { useState, useEffect, useRef } from 'react';
import { useTags } from '../../api/tags';

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onTagSelect?: (tagName: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function TagAutocomplete({ value, onChange, onTagSelect, textareaRef }: TagAutocompleteProps) {
  const { data: tags } = useTags();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Array<{ id: string; name: string; displayName: string; color: string }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect when user types # and extract partial tag name/ID
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !tags) return;

    const pos = textarea.selectionStart || 0;
    setCursorPosition(pos);

    const textBeforeCursor = value.substring(0, pos);
    
    // Match #word pattern at cursor position (tag IDs don't have spaces)
    // Only match single-word patterns with underscores/hyphens
    const hashtagMatch = textBeforeCursor.match(/#([a-zA-Z0-9_-]+)$/);
    
    if (hashtagMatch) {
      const partialTag = hashtagMatch[1].toLowerCase();
      
      // Filter tags that match by ID or displayName
      const matches = tags.filter(tag => 
        tag.name.toLowerCase().includes(partialTag) ||
        tag.displayName.toLowerCase().includes(partialTag)
      );
      
      if (matches.length > 0) {
        setFilteredTags(matches);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, tags, textareaRef]);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredTags.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        if (filteredTags[selectedIndex]) {
          e.preventDefault();
          insertTag(filteredTags[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Attach keyboard handler
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, filteredTags, selectedIndex]);

  // Insert selected tag
  const insertTag = (tag: typeof filteredTags[0]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = cursorPosition;
    const textBeforeCursor = value.substring(0, pos);
    const textAfterCursor = value.substring(pos);
    
    // Find the # symbol before cursor
    const hashtagMatch = textBeforeCursor.match(/#([a-zA-Z0-9_-]+)$/);
    if (!hashtagMatch) return;

    const startPos = textBeforeCursor.length - hashtagMatch[0].length + 1; // +1 to keep the #
    // Insert the tag ID (not displayName) - e.g., "alan_awake" not "Alan Awake"
    const newText = value.substring(0, startPos) + tag.name + ' ' + textAfterCursor;
    
    onChange(newText);
    setShowSuggestions(false);
    
    // Set cursor after the inserted tag
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + tag.name.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    if (onTagSelect) {
      onTagSelect(tag.name);
    }
  };

  // Calculate dropdown position based on cursor
  const getDropdownPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    // Get approximate position - this is simplified
    // In production, you'd use a library like textarea-caret for accurate positioning
    const rect = textarea.getBoundingClientRect();
    return {
      top: rect.bottom,
      left: rect.left,
    };
  };

  if (!showSuggestions || filteredTags.length === 0) {
    return null;
  }

  const position = getDropdownPosition();

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 w-64 rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto dark:border-gray-700 dark:bg-gray-800"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {filteredTags.map((tag, index) => (
        <button
          key={tag.id}
          onClick={() => insertTag(tag)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
            index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
        >
          <span
            className="inline-block h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <div className="flex-1">
            <div className="font-medium">#{tag.displayName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">ID: #{tag.name}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
