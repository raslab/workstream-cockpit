import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';

export type FilterPreset = 'all' | 'today' | 'week' | 'last7';

interface FilterBarProps {
  selectedPreset: FilterPreset;
  onPresetChange: (preset: FilterPreset) => void;
  selectedCategoryIds: string[];
  onCategoryIdsChange: (categoryIds: string[]) => void;
}

export function FilterBar({
  selectedPreset,
  onPresetChange,
  selectedCategoryIds,
  onCategoryIdsChange,
}: FilterBarProps) {
  const { data: categories } = useCategories();
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const presets: { value: FilterPreset; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'last7', label: 'Last 7 Days' },
  ];

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoryIdsChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onCategoryIdsChange([...selectedCategoryIds, categoryId]);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onPresetChange(preset.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedPreset === preset.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {categories && categories.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Categories</span>
            {selectedCategoryIds.length > 0 && (
              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                {selectedCategoryIds.length}
              </span>
            )}
          </button>

          {showCategoryMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => {
                    onCategoryIdsChange([]);
                    setShowCategoryMenu(false);
                  }}
                  className="w-full rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
      return {
        startDate: startOfWeek(now),
        endDate: endOfWeek(now),
      };
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
