import type { ReactNode } from 'react';

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
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const localizedDateTime = formatLocalizedDateTime(value);
  if (!localizedDateTime) return <span className={className}>{children}</span>;

  return (
    <span className={`group/timestamp relative inline-flex ${className}`.trim()}>
      <time dateTime={value} title={localizedDateTime} aria-label={localizedDateTime} tabIndex={0}>
        {children}
      </time>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white shadow-lg group-hover/timestamp:block group-focus-within/timestamp:block dark:bg-gray-100 dark:text-gray-900"
      >
        {localizedDateTime}
      </span>
    </span>
  );
}
