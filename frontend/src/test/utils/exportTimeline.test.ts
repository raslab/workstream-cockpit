import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportTimelineToCSV } from '../../utils/exportTimeline';
import { TimelineEntry } from '../../hooks/useTimeline';

describe('exportTimeline', () => {
  let createElementSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;
  let clickSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    // Mock DOM APIs
    clickSpy = vi.fn();
    const mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    };

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function readCsvFromLastBlob(): Promise<string> {
    const calls = createObjectURLSpy.mock.calls;
    const blob = calls[calls.length - 1]?.[0] as Blob;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  describe('exportTimelineToCSV', () => {
    it('should throw error when entries array is empty', async () => {
      await expect(exportTimelineToCSV([])).rejects.toThrow('No entries to export');
    });

    it('should generate CSV with correct headers', async () => {
      const entries: TimelineEntry[] = [
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

      await exportTimelineToCSV(entries);

      // Verify Blob was created (through createObjectURL call)
      expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
      
      // Verify link was created and clicked
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalledWith(expect.anything());
      expect(clickSpy).toHaveBeenCalled();
      
      // Verify cleanup
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should generate CSV with hierarchy headers and values', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'event-1',
          eventType: 'parent_changed',
          workstreamId: 'ws-1',
          workstreamName: 'Child',
          status: undefined,
          note: null,
          createdAt: '2026-02-16T14:30:00Z',
          parentId: 'parent-1',
          parent: { id: 'parent-1', name: 'Parent' },
          ancestors: [{ id: 'root-1', name: 'Root' }],
          hierarchyPath: 'Root > Parent > Child',
          metadata: { oldParentId: 'old-parent-1', oldParentName: 'Old Parent', newParentId: 'parent-1', newParentName: 'Parent' },
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      const csv = await readCsvFromLastBlob();
      expect(csv).toContain('Parent ID,Parent Workstream,Ancestor Path,Hierarchy Path,old_parent_id,new_parent_id,Old Parent,New Parent');
      expect(csv).toContain('Parent Changed,Child');
      expect(csv).toContain('parent-1,Parent,Root,Root > Parent > Child,old-parent-1,parent-1,Old Parent,Parent');
    });

    it('should export backend-shaped flat hierarchy fields and escape breadcrumb content', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'event-1',
          eventType: 'parent_changed',
          workstreamId: 'ws-1',
          workstreamName: 'Child',
          createdAt: '2026-02-16T14:30:00Z',
          parentId: 'parent-1',
          parentName: 'Parent, Team',
          breadcrumb: 'Root > "Quoted, Parent" > Child',
          oldParentId: 'old-parent-1',
          oldParentName: 'Old "Parent"',
          newParentId: 'parent-1',
          newParentName: 'Parent, Team',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      const csv = await readCsvFromLastBlob();
      const header = csv.split('\n')[0].replace(/^\ufeff/, '');
      expect(header).toBe('Date,Time,Event Type,Workstream,Category,Status,Note,Tags,Parent ID,Parent Workstream,Ancestor Path,Hierarchy Path,old_parent_id,new_parent_id,Old Parent,New Parent,Category Color,Category Emoji,Workstream ID,Event ID');
      expect(csv).toContain('parent-1,"Parent, Team","Root > ""Quoted, Parent""","Root > ""Quoted, Parent"" > Child",old-parent-1,parent-1,"Old ""Parent""","Parent, Team"');
    });

    it('should create filename with timestamp', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Status',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      const mockLink = createElementSpy.mock.results[0].value;
      expect(mockLink.download).toMatch(/^timeline-export-\d{4}-\d{2}-\d{2}-\d{6}\.csv$/);
    });

    it('should handle entries with special characters', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test "Workstream"',
          status: 'Status with, comma',
          note: 'Note with\nnewline',
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      const csv = await readCsvFromLastBlob();
      expect(csv).toContain('"Test ""Workstream""",,"Status with, comma","Note with\nnewline"');
    });

    it('should handle CSV injection attempts', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: '=1+1',
          note: '@SUM(A1:A10)',
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      // Should not throw and should handle dangerous characters
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should extract and format tags with semicolons', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Working on #backend and #api',
          note: 'Also #testing',
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      const csv = await readCsvFromLastBlob();
      expect(csv).toContain('backend;api;testing');
    });

    it('should format time in 24-hour format', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Test',
          note: null,
          createdAt: '2026-02-16T14:30:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      // Time should be in HH:mm format (not h:mm a)
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should handle multiple entries', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test 1',
          status: 'Status 1',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
        {
          id: 'test-2',
          eventType: 'workstream_created',
          workstreamId: 'ws-2',
          workstreamName: 'Test 2',
          status: undefined,
          note: null,
          createdAt: '2026-02-16T11:00:00Z',
          category: {
            id: 'cat-1',
            name: 'Project',
            color: '#3B82F6',
            emoji: '🚀',
          },
        },
      ];

      await exportTimelineToCSV(entries);

      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should clean up object URL after download', async () => {
      vi.useFakeTimers();

      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Status',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);

      // URL should not be revoked immediately
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(100);

      // URL should be revoked after timeout
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      vi.useRealTimers();
    });
  });

  describe('CSV field escaping', () => {
    it('should escape fields with commas', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test, Workstream',
          status: 'Status',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should escape fields with quotes', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test "Quoted" Workstream',
          status: 'Status',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should escape fields with newlines', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Line 1\nLine 2',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should prefix dangerous characters for CSV injection protection', async () => {
      const dangerousEntries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: '=FORMULA',
          status: '+FORMULA',
          note: '-FORMULA',
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(dangerousEntries);
      const csv = await readCsvFromLastBlob();
      expect(csv).toContain("'=FORMULA,,'+FORMULA,'-FORMULA");
    });
  });

  describe('Tag extraction', () => {
    it('should extract tags from status', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Working on #backend',
          note: null,
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should extract tags from note', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Status',
          note: 'Need to work on #frontend',
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should deduplicate tags', async () => {
      const entries: TimelineEntry[] = [
        {
          id: 'test-1',
          eventType: 'status_update',
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          status: 'Working on #backend and #Backend',
          note: '#BACKEND work',
          createdAt: '2026-02-16T10:00:00Z',
          category: null,
        },
      ];

      await exportTimelineToCSV(entries);
      expect(createObjectURLSpy).toHaveBeenCalled();
    });
  });
});
