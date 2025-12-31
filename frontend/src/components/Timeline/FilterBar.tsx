import { useState } from 'react';
import { useTags } from '../../hooks/useTags';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';

export type FilterPreset = 'all' | 'today' | 'week' | 'last7';

interface FilterBarProps {
  selectedPreset: FilterPreset;
  onPresetChange: (preset: FilterPreset) => void;
  selectedTagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
}

export function FilterBar({
  selectedPreset,
  onPresetChange,
  selectedTagIds,
  onTagIdsChange,
}: FilterBarProps) {
  const { data: tags } = useTags();
  const [showTagMenu, setShowTagMenu] = useState(false);

  const presets: { value: FilterPreset; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'last7', label: 'Last 7 Days' },
  ];

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagIdsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagIdsChange([...selectedTagIds, tagId]);
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

      {tags && tags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowTagMenu(!showTagMenu)}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Tags</span>
            {selectedTagIds.length > 0 && (
              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                {selectedTagIds.length}
              </span>
            )}
          </button>

          {showTagMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-gray-700">{tag.name}</span>
                  </label>
                ))}
              </div>
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => {
                    onTagIdsChange([]);
                    setShowTagMenu(false);
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
