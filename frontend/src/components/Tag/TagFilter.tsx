import { useState, useRef, useEffect, useMemo } from 'react';
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>Tags</span>
        {selectedTags.length > 0 && (
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
            {selectedTags.length}
          </span>
        )}
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-200 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Tag list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTags.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No tags found
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
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
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={clearAllTags}
                className="w-full rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
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
