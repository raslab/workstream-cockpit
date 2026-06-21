import { useState, useRef, useEffect, useId } from 'react';
import { format, isValid, parseISO } from 'date-fns';

export type DateRangeQuickPreset =
  | 'last-7-days'
  | 'last-14-days'
  | 'last-30-days'
  | 'last-60-days'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter';

interface DateRangeFilterProps {
  startDate?: Date;
  endDate?: Date;
  quickPreset?: DateRangeQuickPreset;
  quickDays?: 7 | 14 | 30 | 60;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onQuickPresetChange?: (preset: DateRangeQuickPreset | undefined) => void;
  onQuickDaysChange?: (preset: DateRangeQuickPreset | undefined) => void;
  onClear: () => void;
}

const quickPresets: Array<{ value: DateRangeQuickPreset; label: string }> = [
  { value: 'last-7-days', label: 'Last 7 days' },
  { value: 'last-14-days', label: 'Last 14 days' },
  { value: 'last-30-days', label: 'Last 30 days' },
  { value: 'last-60-days', label: 'Last 60 days' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Previous month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'last-quarter', label: 'Previous quarter' },
];

export function DateRangeFilter({
  startDate,
  endDate,
  quickPreset,
  quickDays,
  onStartDateChange,
  onEndDateChange,
  onQuickPresetChange,
  onQuickDaysChange,
  onClear,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selectedValueId = useId();
  const selectedPreset = quickPreset ?? (quickDays ? (`last-${quickDays}-days` as DateRangeQuickPreset) : undefined);
  const handleQuickPresetChange = onQuickPresetChange ?? onQuickDaysChange;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format dates for input[type="date"]
  const startDateStr = startDate && isValid(startDate) ? format(startDate, 'yyyy-MM-dd') : '';
  const endDateStr = endDate && isValid(endDate) ? format(endDate, 'yyyy-MM-dd') : '';

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      onStartDateChange(undefined);
      return;
    }
    const date = parseISO(e.target.value);
    if (isValid(date)) {
      onStartDateChange(date);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      onEndDateChange(undefined);
      return;
    }
    const date = parseISO(e.target.value);
    if (isValid(date)) {
      onEndDateChange(date);
    }
  };

  const handleClear = () => {
    handleQuickPresetChange?.(undefined);
    onClear();
    setIsOpen(false);
  };

  // Display label for the button
  const getButtonLabel = () => {
    if (selectedPreset) {
      return quickPresets.find((preset) => preset.value === selectedPreset)?.label ?? 'Custom range';
    }
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    } else if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    } else if (endDate) {
      return `Until ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'Any time';
  };

  const buttonLabel = getButtonLabel();
  const hasSelection = startDate || endDate || selectedPreset;

  return (
    <div className="relative" ref={dropdownRef}>
      <span id={labelId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Time range
      </span>
      <button
        type="button"
        aria-labelledby={`${labelId} ${selectedValueId}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm hover:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <span id={selectedValueId} className="truncate">{buttonLabel}</span>
        {hasSelection && (
          <span aria-hidden="true" className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] leading-none text-white">
            ✓
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
        <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-4 p-4">
            {/* Start Date */}
            <div>
              <label htmlFor="timeline-start-date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                id="timeline-start-date"
                type="date"
                value={startDateStr}
                onChange={handleStartChange}
                max={endDateStr || undefined}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="timeline-end-date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                id="timeline-end-date"
                type="date"
                value={endDateStr}
                onChange={handleEndChange}
                min={startDateStr || undefined}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Quick Select</div>
              <div className="grid grid-cols-2 gap-2">
                {quickPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      handleQuickPresetChange?.(preset.value);
                      setIsOpen(false);
                    }}
                    className={`rounded px-3 py-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
                      selectedPreset === preset.value
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              {hasSelection && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-auto rounded bg-primary-600 px-4 py-1.5 text-sm text-white hover:bg-primary-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
