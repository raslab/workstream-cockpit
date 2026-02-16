import { useState } from 'react';
import { TimelineEntry } from '../../hooks/useTimeline';
import { exportTimelineToCSV } from '../../utils/exportTimeline';

interface ExportButtonProps {
  entries: TimelineEntry[];
}

export function ExportButton({ entries }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (entries.length === 0) return;

    setIsExporting(true);
    try {
      await exportTimelineToCSV(entries);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export timeline. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const disabled = entries.length === 0 || isExporting;
  const ariaLabel = disabled
    ? 'Export timeline to CSV (no entries to export)'
    : `Export ${entries.length} timeline entries to CSV`;

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      aria-label={ariaLabel}
      title={disabled ? 'No entries to export' : `Export ${entries.length} entries`}
      className={`
        flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium
        ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
    </button>
  );
}
