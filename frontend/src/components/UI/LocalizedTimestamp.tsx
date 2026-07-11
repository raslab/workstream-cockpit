import { useId, type ReactNode } from 'react';

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
  if (!localizedDateTime) return <span className={className}>{children}</span>;

  return (
    <span className={`inline-flex ${className}`.trim()}>
      <time
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
      >
        {children}
      </time>
      <span id={tooltipId} className="sr-only">
        Exact timestamp: {localizedDateTime}
      </span>
    </span>
  );
}
