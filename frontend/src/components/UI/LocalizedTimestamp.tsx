import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function formatLocalizedDateTime(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function LocalizedTimestamp({
  value,
  children,
  className = '',
  accessibleLabel,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  accessibleLabel?: string;
}) {
  const localizedDateTime = formatLocalizedDateTime(value);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLTimeElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  if (!localizedDateTime) return <span className={className}>{children}</span>;

  const showTooltip = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setTooltipPosition({ left: rect.left + rect.width / 2, top: rect.top });
  };

  return (
    <span className={`inline-flex ${className}`.trim()}>
      <time
        ref={triggerRef}
        dateTime={value}
        title={localizedDateTime}
        aria-label={
          accessibleLabel ??
          (typeof children === 'string'
            ? `${children} (exact timestamp: ${localizedDateTime})`
            : localizedDateTime)
        }
        aria-describedby={tooltipId}
        tabIndex={0}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltipPosition(null)}
      >
        {children}
      </time>
      <span id={tooltipId} className="sr-only">
        Exact timestamp: {localizedDateTime}
      </span>
      {tooltipPosition &&
        createPortal(
          <span
            role="tooltip"
            aria-hidden="true"
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
          >
            {localizedDateTime}
          </span>,
          document.body,
        )}
    </span>
  );
}
