import { describe, expect, it } from 'vitest';
import type { Workstream } from '../../types/workstream';
import {
  applyHierarchyFilter,
  getBreadcrumbLabel,
  getDirectSubstreamCount,
  getHierarchyTimestamp,
  getWorkstreamName,
  groupWorkstreamsByParent,
  isObviousSubstream,
} from '../../utils/hierarchy';

const base = (overrides: Partial<Workstream>): Workstream => ({
  id: 'ws',
  projectId: 'project',
  name: 'Workstream',
  categoryId: null,
  context: null,
  state: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  closedAt: null,
  allTags: [],
  ...overrides,
});

describe('parent stream utilities', () => {
  const parent = base({ id: 'parent', name: 'Parent', activeSubstreamCount: 1, substreamCount: 2, parentId: null, depth: 1 });
  const substream = base({ id: 'substream', name: 'Sub-stream', parentId: 'parent', parent: { id: 'parent', name: 'Parent' }, depth: 2 });
  const closedSubstream = base({ id: 'closed-substream', name: 'Closed Sub-stream', parentId: 'parent', state: 'closed', depth: 2 });

  it('renders breadcrumb labels from root to current stream', () => {
    expect(getBreadcrumbLabel(base({ name: 'Leaf', parentStreams: [{ id: 'root', name: 'Root' }, { id: 'parent', name: 'Parent' }] }))).toBe(
      'Root > Parent > Leaf'
    );
    expect(getBreadcrumbLabel(base({ name: 'Top', parentStreams: [] }))).toBe('Top');
  });

  it('filters top-level, sub-stream, and streams with substreams without recursive trees', () => {
    const streams = [parent, substream, closedSubstream];
    expect(applyHierarchyFilter(streams, 'top-level').map((w) => w.id)).toEqual(['parent']);
    expect(applyHierarchyFilter(streams, 'sub-streams').map((w) => w.id)).toEqual(['substream', 'closed-substream']);
    expect(applyHierarchyFilter(streams, 'has-substreams').map((w) => w.id)).toEqual(['parent']);
  });

  it('groups direct substreams under their direct parent and keeps orphans top-level', () => {
    const groups = groupWorkstreamsByParent([substream, parent, base({ id: 'orphan', name: 'Orphan', parentId: 'missing' })]);
    expect(groups.map((g) => [g.key, g.name, g.workstreams.map((w) => w.id)])).toEqual([
      ['parent', 'Parent', ['parent', 'substream']],
      ['top-level', 'Top level / no parent', ['orphan']],
    ]);
  });

  it('uses explicit parent stream timestamps for sorting', () => {
    const ws = base({
      latestStatus: { id: 's', workstreamId: 'ws', status: 'done', note: null, createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
      lastDirectUpdateAt: '2026-01-03T00:00:00Z',
      lastSubstreamActivityAt: '2026-01-04T00:00:00Z',
      lastActivityAt: '2026-01-05T00:00:00Z',
    });
    expect(getHierarchyTimestamp(ws, 'lastDirectUpdateAt')).toBe(Date.parse('2026-01-03T00:00:00Z'));
    expect(getHierarchyTimestamp(ws, 'lastSubstreamActivityAt')).toBe(Date.parse('2026-01-04T00:00:00Z'));
    expect(getHierarchyTimestamp(ws, 'lastActivityAt')).toBe(Date.parse('2026-01-05T00:00:00Z'));
  });

  it('normalizes backend parent stream naming variants', () => {
    expect(getWorkstreamName({ id: 'source', workstreamName: 'Source Name' })).toBe('Source Name');
    expect(getDirectSubstreamCount(base({ directSubstreamCount: 4, substreamCount: 1, substreams: [] }))).toBe(4);
    expect(applyHierarchyFilter([base({ id: 'direct', directSubstreamCount: 2 }), base({ id: 'none', substreamCount: 0 })], 'has-substreams').map((w) => w.id)).toEqual(['direct']);
  });

  it('detects obvious sub-streams when selecting parents', () => {
    const root = base({ id: 'root', name: 'Root', substreams: [{ id: 'substream', name: 'Sub-stream' }] });
    const nestedSubstream = base({ id: 'nested-substream', name: 'Nested sub-stream', parentStreams: [{ id: 'root', name: 'Root' }, { id: 'substream', name: 'Sub-stream' }] });
    expect(isObviousSubstream(nestedSubstream, root)).toBe(true);
    expect(isObviousSubstream(base({ id: 'other', name: 'Other' }), root)).toBe(false);
  });
});
