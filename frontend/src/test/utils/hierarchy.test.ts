import { describe, expect, it } from 'vitest';
import type { Workstream } from '../../types/workstream';
import {
  applyCockpitHierarchyFilter,
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
      ['parent', 'Parent', ['substream']],
      ['top-level', 'Top level / no parent', ['orphan']],
    ]);
  });

  it('groups filtered sub-streams by their parent metadata when the parent row is filtered out', () => {
    const groups = groupWorkstreamsByParent([
      substream,
      base({
        id: 'second-substream',
        name: 'Second sub-stream',
        parentId: 'parent',
        parent: { id: 'parent', name: 'Parent' },
        depth: 2,
      }),
    ]);

    expect(groups.map((g) => [g.key, g.name, g.workstreams.map((w) => w.id)])).toEqual([
      ['parent', 'Parent', ['substream', 'second-substream']],
    ]);
  });

  it('filters streams under selected parents without returning the selected parents themselves', () => {
    const nestedSubstream = base({
      id: 'nested-substream',
      name: 'Nested sub-stream',
      parentId: 'substream',
      parent: { id: 'substream', name: 'Sub-stream' },
      parentStreams: [{ id: 'parent', name: 'Parent' }, { id: 'substream', name: 'Sub-stream' }],
      depth: 3,
    });
    const leafSubstream = base({
      id: 'leaf-substream',
      name: 'Leaf sub-stream',
      parentId: 'nested-substream',
      parent: { id: 'nested-substream', name: 'Nested sub-stream' },
      parentStreams: [{ id: 'parent', name: 'Parent' }, { id: 'substream', name: 'Sub-stream' }, { id: 'nested-substream', name: 'Nested sub-stream' }],
      depth: 4,
    });
    const otherParent = base({ id: 'other-parent', name: 'Other parent', parentId: null, depth: 1 });
    const otherSubstream = base({ id: 'other-substream', name: 'Other sub-stream', parentId: 'other-parent', parent: { id: 'other-parent', name: 'Other parent' }, depth: 2 });
    const streams = [parent, substream, nestedSubstream, leafSubstream, otherParent, otherSubstream];

    expect(applyCockpitHierarchyFilter(streams, {
      mode: 'under-parent',
      parentId: null,
      parentIds: ['parent', 'other-parent'],
      includeSubstreams: false,
    }).map((w) => w.id)).toEqual(['substream', 'other-substream']);

    expect(applyCockpitHierarchyFilter(streams, {
      mode: 'under-parent',
      parentId: null,
      parentIds: ['parent'],
      includeSubstreams: true,
    }).map((w) => w.id)).toEqual(['substream', 'nested-substream', 'leaf-substream']);

    expect(applyCockpitHierarchyFilter(streams, {
      mode: 'under-parent',
      parentId: null,
      parentIds: ['leaf-substream'],
      includeSubstreams: true,
    }).map((w) => w.id)).toEqual([]);
  });

  it('keeps selected parent streams when they are also sub-streams of another selected parent', () => {
    const streamA = base({ id: 'a', name: 'A', parentId: null, depth: 1 });
    const streamB = base({ id: 'b', name: 'B', parentId: 'a', parent: { id: 'a', name: 'A' }, parentStreams: [{ id: 'a', name: 'A' }], depth: 2 });
    const streamC = base({ id: 'c', name: 'C', parentId: 'b', parent: { id: 'b', name: 'B' }, parentStreams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], depth: 3 });
    const streams = [streamA, streamB, streamC];

    expect(applyCockpitHierarchyFilter(streams, {
      mode: 'under-parent',
      parentId: null,
      parentIds: ['a'],
      includeSubstreams: false,
    }).map((w) => w.id)).toEqual(['b']);

    expect(applyCockpitHierarchyFilter(streams, {
      mode: 'under-parent',
      parentId: null,
      parentIds: ['a'],
      includeSubstreams: true,
    }).map((w) => w.id)).toEqual(['b', 'c']);

    expect(applyCockpitHierarchyFilter(streams, {
      mode: 'under-parent',
      parentId: null,
      parentIds: ['a', 'b'],
      includeSubstreams: false,
    }).map((w) => w.id)).toEqual(['b', 'c']);
  });

  it('groups recursive under-parent results by the selected filter parent instead of the immediate parent', () => {
    const streamB = base({ id: 'b', number: 2, name: 'B', parentId: 'a', parent: { id: 'a', number: 1, name: 'A' }, parentStreams: [{ id: 'a', number: 1, name: 'A' }], depth: 2 });
    const streamC = base({ id: 'c', number: 3, name: 'C', parentId: 'b', parent: { id: 'b', number: 2, name: 'B' }, parentStreams: [{ id: 'a', number: 1, name: 'A' }, { id: 'b', number: 2, name: 'B' }], depth: 3 });

    const groups = groupWorkstreamsByParent([streamB, streamC], { scopedParentIds: ['a'] });

    expect(groups.map((g) => [g.key, g.name, g.workstreams.map((w) => w.id)])).toEqual([
      ['a', '#1 A', ['b', 'c']],
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

  it('falls back to status creation time, not edit time, for freshness sorting', () => {
    const ws = base({
      latestStatus: {
        id: 's',
        workstreamId: 'ws',
        status: 'Corrected old history',
        note: null,
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-08T00:00:00Z',
      },
    });

    expect(getHierarchyTimestamp(ws, 'lastDirectUpdateAt')).toBe(Date.parse('2026-01-02T00:00:00Z'));
    expect(getHierarchyTimestamp(ws, 'lastActivityAt')).toBe(Date.parse('2026-01-02T00:00:00Z'));
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
