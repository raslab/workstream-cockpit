import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { useTags } from '../../api/tags';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const { data: tags, isLoading } = useTags();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const selectedValueId = useId();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery(''); // Reset search when closing
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!searchQuery.trim()) return tags;
    
    const query = searchQuery.toLowerCase();
    return tags.filter(
      (tag) =>
        tag.displayName.toLowerCase().includes(query) ||
        tag.name.toLowerCase().includes(query)
    );
  }, [tags, searchQuery]);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearAllTags = () => {
    onTagsChange([]);
  };

  if (isLoading || !tags || tags.length === 0) {
    return null;
  }

  const selectedTagRecords = tags.filter((tag) => selectedTags.includes(tag.name));
  const buttonLabel = (() => {
    if (selectedTagRecords.length === 0) return 'All tags';
    if (selectedTagRecords.length === 1) return `#${selectedTagRecords[0].displayName}`;
    return `${selectedTagRecords.length} tags`;
  })();

  return (
    <div className="relative" ref={dropdownRef}>
      <span id={labelId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Tags
      </span>
      <button
        type="button"
        aria-labelledby={`${labelId} ${selectedValueId}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => {
            if (open) {
              setSearchQuery('');
            }
            return !open;
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm hover:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <span id={selectedValueId} className="truncate">{buttonLabel}</span>
        {selectedTags.length > 0 && (
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
            {selectedTags.length}
          </span>
        )}
        <svg
          aria-hidden="true"
          className={`h-4 w-4 flex-none text-gray-500 transition-transform dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`.trim()}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Search input */}
          <div className="border-b border-gray-200 p-2 dark:border-gray-700">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* Tag list */}
          <div className="max-h-64 overflow-y-auto p-2 dark-scrollbar">
            {filteredTags.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No tags found
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-600 dark:border-gray-500 dark:bg-gray-900 dark:text-primary-400 dark:accent-primary-400"
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">#{tag.displayName}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear button */}
          {selectedTags.length > 0 && (
            <div className="border-t border-gray-200 p-2 dark:border-gray-700">
              <button
                type="button"
                onClick={clearAllTags}
                className="w-full rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
