import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { TagFilter } from '../Tag/TagFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export type FilterPreset = 'all' | 'today' | 'week' | 'last7' | 'custom';

interface FilterBarProps {
  selectedCategoryIds: string[];
  onCategoryIdsChange: (categoryIds: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  quickDays?: 7 | 14 | 30;
  onCustomStartDateChange: (date: Date | undefined) => void;
  onCustomEndDateChange: (date: Date | undefined) => void;
  onQuickDaysChange?: (days: 7 | 14 | 30 | undefined) => void;
}

export function FilterBar({
  selectedCategoryIds,
  onCategoryIdsChange,
  selectedTags,
  onTagsChange,
  customStartDate,
  customEndDate,
  quickDays,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onQuickDaysChange,
}: FilterBarProps) {
  const { data: categories } = useCategories();
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoryIdsChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onCategoryIdsChange([...selectedCategoryIds, categoryId]);
    }
  };

  return (
    <>
      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={customStartDate}
        endDate={customEndDate}
        quickDays={quickDays}
        onStartDateChange={onCustomStartDateChange}
        onEndDateChange={onCustomEndDateChange}
        onQuickDaysChange={onQuickDaysChange}
        onClear={() => {
          onCustomStartDateChange(undefined);
          onCustomEndDateChange(undefined);
        }}
      />

      {categories && categories.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>Categories</span>
            {selectedCategoryIds.length > 0 && (
              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                {selectedCategoryIds.length}
              </span>
            )}
            <span className="text-xs">{showCategoryMenu ? '▲' : '▼'}</span>
          </button>

          {showCategoryMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="p-2 dark-scrollbar">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-900 dark:text-primary-400 dark:accent-primary-400"
                    />
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                  </label>
                ))}
              </div>
              <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                <button
                  onClick={() => {
                    onCategoryIdsChange([]);
                    setShowCategoryMenu(false);
                  }}
                  className="w-full rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tag Filter */}
      <TagFilter selectedTags={selectedTags} onTagsChange={onTagsChange} />
    </>
  );
}

export function getDateRangeFromPreset(preset: FilterPreset): {
  startDate?: Date;
  endDate?: Date;
} {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case 'week':
      return getDateRangeFromPreset('last7');
    case 'last7':
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now),
      };
    case 'all':
    default:
      return {};
  }
}
