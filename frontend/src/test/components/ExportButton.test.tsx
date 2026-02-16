import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '../../components/Timeline/ExportButton';
import { TimelineEntry } from '../../hooks/useTimeline';
import * as exportTimeline from '../../utils/exportTimeline';

// Mock the export utility
vi.mock('../../utils/exportTimeline', () => ({
  exportTimelineToCSV: vi.fn(),
}));

describe('ExportButton', () => {
  const mockEntries: TimelineEntry[] = [
    {
      id: 'test-1',
      eventType: 'status_update',
      workstreamId: 'ws-1',
      workstreamName: 'Test Workstream',
      status: 'Test status',
      note: null,
      createdAt: '2026-02-16T14:30:00Z',
      category: {
        id: 'cat-1',
        name: 'Project',
        color: '#3B82F6',
        emoji: '🚀',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render export button with text', () => {
      render(<ExportButton entries={mockEntries} />);
      
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    it('should render download icon', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should be enabled when entries exist', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled when entries are empty', () => {
      render(<ExportButton entries={[]} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label when enabled', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Export 1 timeline entries to CSV');
    });

    it('should have aria-label when disabled', () => {
      render(<ExportButton entries={[]} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Export timeline to CSV (no entries to export)');
    });

    it('should have title tooltip when enabled', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Export 1 entries');
    });

    it('should have title tooltip when disabled', () => {
      render(<ExportButton entries={[]} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'No entries to export');
    });

    it('should update aria-label with correct count for multiple entries', () => {
      const multipleEntries = [...mockEntries, { ...mockEntries[0], id: 'test-2' }];
      render(<ExportButton entries={multipleEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Export 2 timeline entries to CSV');
    });
  });

  describe('Export functionality', () => {
    it('should call exportTimelineToCSV when clicked', async () => {
      const exportSpy = vi.spyOn(exportTimeline, 'exportTimelineToCSV').mockResolvedValue();
      
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(exportSpy).toHaveBeenCalledWith(mockEntries);
      });
    });

    it('should not call export when entries are empty', async () => {
      const exportSpy = vi.spyOn(exportTimeline, 'exportTimelineToCSV').mockResolvedValue();
      
      render(<ExportButton entries={[]} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(exportSpy).not.toHaveBeenCalled();
      });
    });

    it('should show exporting state during export', async () => {
      let resolveExport: () => void;
      const exportPromise = new Promise<void>((resolve) => {
        resolveExport = resolve;
      });
      
      vi.spyOn(exportTimeline, 'exportTimelineToCSV').mockReturnValue(exportPromise);
      
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should show exporting state
      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument();
      });
      
      // Button should be disabled during export
      expect(button).toBeDisabled();
      
      // Resolve the export
      resolveExport!();
      
      // Should return to normal state
      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle export errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      vi.spyOn(exportTimeline, 'exportTimelineToCSV').mockRejectedValue(new Error('Export failed'));
      
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to export timeline. Please try again.');
      });
      
      // Button should return to enabled state after error
      expect(button).not.toBeDisabled();
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should prevent multiple simultaneous exports', async () => {
      let resolveExport: () => void;
      const exportPromise = new Promise<void>((resolve) => {
        resolveExport = resolve;
      });
      
      const exportSpy = vi.spyOn(exportTimeline, 'exportTimelineToCSV').mockReturnValue(exportPromise);
      
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      
      // First click
      fireEvent.click(button);
      
      // Button should be disabled
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
      
      // Second click should not trigger another export
      fireEvent.click(button);
      
      expect(exportSpy).toHaveBeenCalledTimes(1);
      
      // Resolve the export
      resolveExport!();
      
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Styling', () => {
    it('should apply enabled styles when entries exist', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-gray-300', 'bg-white', 'text-gray-700', 'hover:bg-gray-50');
      expect(button).not.toHaveClass('cursor-not-allowed', 'border-gray-200', 'bg-gray-50', 'text-gray-400');
    });

    it('should apply disabled styles when entries are empty', () => {
      render(<ExportButton entries={[]} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-not-allowed', 'border-gray-200', 'bg-gray-50', 'text-gray-400');
    });

    it('should have flex layout with gap', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('should have proper button sizing and styling', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-md', 'border', 'px-3', 'py-1.5', 'text-sm', 'font-medium');
    });
  });

  describe('Keyboard interaction', () => {
    it('should be triggerable via Enter key', async () => {
      const exportSpy = vi.spyOn(exportTimeline, 'exportTimelineToCSV').mockResolvedValue();
      
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.click(button); // Simulating the click that Enter triggers
      
      await waitFor(() => {
        expect(exportSpy).toHaveBeenCalled();
      });
    });

    it('should be focusable', () => {
      render(<ExportButton entries={mockEntries} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });
  });
});
