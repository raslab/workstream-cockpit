import { useState, useRef, useEffect } from 'react';
import { format, isValid, parseISO } from 'date-fns';

interface DateRangeFilterProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClear: () => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    onClear();
    setIsOpen(false);
  };

  // Display label for the button
  const getButtonLabel = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    } else if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    } else if (endDate) {
      return `Until ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'Date Range';
  };

  const hasSelection = startDate || endDate;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <span>{getButtonLabel()}</span>
        {hasSelection && (
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
            ✓
          </span>
        )}
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="p-4 space-y-4">
            {/* Start Date */}
            <div>
              <label htmlFor="timeline-start-date" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
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
              <label htmlFor="timeline-end-date" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
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
              <div className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Quick Select</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    onStartDateChange(today);
                    onEndDateChange(new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1));
                  }}
                  className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    weekAgo.setHours(0, 0, 0, 0);
                    onStartDateChange(weekAgo);
                    onEndDateChange(today);
                  }}
                  className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    monthAgo.setHours(0, 0, 0, 0);
                    onStartDateChange(monthAgo);
                    onEndDateChange(today);
                  }}
                  className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const start = new Date(today.getFullYear(), today.getMonth(), 1);
                    onStartDateChange(start);
                    onEndDateChange(today);
                  }}
                  className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              {hasSelection && (
                <button
                  onClick={handleClear}
                  className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Clear
                </button>
              )}
              <button
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
