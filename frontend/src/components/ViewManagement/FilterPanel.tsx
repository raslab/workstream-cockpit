import { useState, useRef, useEffect, useMemo } from 'react';
import type { FilterConfig, SortConfig, GroupConfig } from '../../types/view';
import { useCategories } from '../../hooks/useCategories';
import { useTags } from '../../api/tags';

interface FilterPanelProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onClose: () => void;
}

export function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const [localFilters, setLocalFilters] = useState(filters);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const tagSearchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: FilterConfig = {
      categoryIds: [],
      tags: [],
      temporal: { notUpdatedToday: false },
    };
    setLocalFilters(clearedFilters);
  };

  const toggleCategory = (categoryId: string) => {
    setLocalFilters({
      ...localFilters,
      categoryIds: localFilters.categoryIds.includes(categoryId)
        ? localFilters.categoryIds.filter((id) => id !== categoryId)
        : [...localFilters.categoryIds, categoryId],
    });
  };

  const toggleTag = (tagName: string) => {
    setLocalFilters({
      ...localFilters,
      tags: localFilters.tags.includes(tagName)
        ? localFilters.tags.filter((t) => t !== tagName)
        : [...localFilters.tags, tagName],
    });
  };

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!tagSearchQuery.trim()) return tags;
    
    const query = tagSearchQuery.toLowerCase();
    return tags.filter(
      (tag) =>
        tag.displayName.toLowerCase().includes(query) ||
        tag.name.toLowerCase().includes(query)
    );
  }, [tags, tagSearchQuery]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="max-h-96 overflow-y-auto dark-scrollbar">
        {/* Categories Section */}
        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Categories</h4>
          <div className="space-y-1">
            {categories?.map((category) => (
              <label
                key={category.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={localFilters.categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-900 dark:text-primary-400 dark:accent-primary-400"
                />
                <div
                  className="flex h-5 w-5 items-center justify-center rounded text-sm"
                  style={{ backgroundColor: category.color }}
                >
                  {category.emoji}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags Section - Placeholder for Phase 3 */}
        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Tags</h4>
          {tags && tags.length > 0 ? (
            <>
              {/* Search input */}
              <input
                ref={tagSearchRef}
                type="text"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
              
              {/* Tag list */}
              <div className="max-h-40 space-y-1 overflow-y-auto dark-scrollbar">
                {filteredTags.length === 0 ? (
                  <p className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">No tags found</p>
                ) : (
                  filteredTags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={localFilters.tags.includes(tag.name)}
                        onChange={() => toggleTag(tag.name)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-900 dark:text-primary-400 dark:accent-primary-400"
                      />
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">#{tag.displayName}</span>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No tags available</p>
          )}
        </div>

        {/* Temporal Section - Placeholder for Phase 4 */}
        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Other</h4>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={localFilters.temporal.notUpdatedToday}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  temporal: { notUpdatedToday: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-600 dark:border-gray-500 dark:bg-gray-900 dark:text-primary-400 dark:accent-primary-400"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Not updated today</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 p-3 dark:border-gray-700">
        <button
          onClick={handleClear}
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          Clear all
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

interface SortMenuProps {
  currentSort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  onClose: () => void;
}

export function SortMenu({ currentSort, onSortChange, onClose }: SortMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const sortOptions: { field: SortConfig['field']; label: string }[] = [
    { field: 'updatedAt', label: 'Last Updated' },
    { field: 'createdAt', label: 'Created Date' },
    { field: 'name', label: 'Name' },
  ];

  const handleSelect = (field: SortConfig['field']) => {
    // Toggle direction if same field, otherwise use sensible default
    const direction =
      currentSort.field === field
        ? currentSort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : field === 'name'
        ? 'asc'
        : 'desc';

    onSortChange({ field, direction });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="p-1">
        {sortOptions.map((option) => {
          const isActive = currentSort.field === option.field;
          return (
            <button
              key={option.field}
              onClick={() => handleSelect(option.field)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isActive ? 'bg-gray-50 font-medium text-primary-600 dark:bg-gray-900 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{option.label}</span>
              {isActive && (
                <span className="text-xs">
                  {currentSort.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface GroupMenuProps {
  currentGroup: GroupConfig;
  onGroupChange: (group: GroupConfig) => void;
  onClose: () => void;
}

export function GroupMenu({ currentGroup, onGroupChange, onClose }: GroupMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const groupOptions: { by: GroupConfig['by']; label: string }[] = [
    { by: 'none', label: 'None' },
    { by: 'category', label: 'Category' },
  ];

  const handleSelect = (by: GroupConfig['by']) => {
    onGroupChange({ by });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="p-1">
        {groupOptions.map((option) => {
          const isActive = currentGroup.by === option.by;
          return (
            <button
              key={option.by}
              onClick={() => handleSelect(option.by)}
              className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isActive ? 'bg-gray-50 font-medium text-primary-600 dark:bg-gray-900 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
