import { TimelineEntry } from '../hooks/useTimeline';
import { format, parseISO } from 'date-fns';

/**
 * Extract hashtags from text content
 * Matches #word, #word-with-hyphens, #word_with_underscores
 */
function extractTags(text: string): string[] {
  if (!text) return [];
  
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(hashtagPattern);
  
  const tags = Array.from(matches, m => m[1]);
  
  // Remove duplicates (case-insensitive)
  const uniqueTags = Array.from(
    new Set(tags.map(tag => tag.toLowerCase()))
  );
  
  return uniqueTags;
}

/**
 * Extract tags from timeline entry text content
 */
function extractEntryTags(entry: TimelineEntry): string[] {
  const textFields = [
    entry.status,
    entry.note,
  ].filter(Boolean);
  
  if (textFields.length === 0) return [];
  
  return extractTags(textFields.join(' '));
}

/**
 * Escape CSV field value (handle commas, quotes, newlines, CSV injection)
 * Implements RFC 4180 standard with security enhancements
 */
function escapeCSVField(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  
  let stringValue = String(value);
  
  // CSV Injection Protection: Prefix dangerous characters
  // Prevents formula execution in Excel/Google Sheets
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some(char => stringValue.startsWith(char))) {
    stringValue = "'" + stringValue;
  }
  
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convert timeline entry to CSV row
 */
function entryToCSVRow(entry: TimelineEntry): string {
  const date = parseISO(entry.createdAt);
  const tags = extractEntryTags(entry);
  
  // Map event type to readable label
  const eventTypeLabels: Record<string, string> = {
    status_update: 'Status Update',
    workstream_created: 'Workstream Created',
    workstream_closed: 'Workstream Closed',
  };
  
  const columns = [
    format(date, 'yyyy-MM-dd'),           // Date first for sorting
    format(date, 'HH:mm'),                // Time in 24-hour format
    eventTypeLabels[entry.eventType] || entry.eventType,
    entry.workstreamName,
    entry.category?.name || '',
    entry.status || '',
    entry.note || '',
    tags.join(';'),                       // Semicolon separator
    entry.category?.color || '',
    entry.category?.emoji || '',
    entry.workstreamId,
    entry.id,
  ];
  
  return columns.map(escapeCSVField).join(',');
}

/**
 * Generate CSV content from timeline entries
 */
function generateCSV(entries: TimelineEntry[]): string {
  const headers = [
    'Date',
    'Time',
    'Event Type',
    'Workstream',
    'Category',
    'Status',
    'Note',
    'Tags',
    'Category Color',
    'Category Emoji',
    'Workstream ID',
    'Event ID',
  ];
  
  const headerRow = headers.join(','); // Headers don't need escaping
  const dataRows = entries.map(entryToCSVRow);
  
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\ufeff';
  
  return BOM + headerRow + '\n' + dataRows.join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export timeline entries to CSV file
 */
export async function exportTimelineToCSV(entries: TimelineEntry[]): Promise<void> {
  if (entries.length === 0) {
    throw new Error('No entries to export');
  }
  
  const csv = generateCSV(entries);
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const filename = `timeline-export-${timestamp}.csv`;
  
  downloadCSV(csv, filename);
}
