import { describe, expect, it } from 'vitest';
import type { Workstream } from '../../types/workstream';
import {
  applyHierarchyFilter,
  getBreadcrumbLabel,
  getDirectChildCount,
  getHierarchyTimestamp,
  getWorkstreamName,
  groupWorkstreamsByParent,
  isObviousDescendant,
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

describe('hierarchy utilities', () => {
  const parent = base({ id: 'parent', name: 'Parent', activeChildCount: 1, childCount: 2, parentId: null, depth: 1 });
  const child = base({ id: 'child', name: 'Child', parentId: 'parent', parent: { id: 'parent', name: 'Parent' }, depth: 2 });
  const closedChild = base({ id: 'closed-child', name: 'Closed Child', parentId: 'parent', state: 'closed', depth: 2 });

  it('renders breadcrumb labels from root to current stream', () => {
    expect(getBreadcrumbLabel(base({ name: 'Leaf', ancestors: [{ id: 'root', name: 'Root' }, { id: 'parent', name: 'Parent' }] }))).toBe(
      'Root > Parent > Leaf'
    );
    expect(getBreadcrumbLabel(base({ name: 'Top', ancestors: [] }))).toBe('Top');
  });

  it('filters top-level, sub-stream, and streams with children without recursive trees', () => {
    const streams = [parent, child, closedChild];
    expect(applyHierarchyFilter(streams, 'top-level').map((w) => w.id)).toEqual(['parent']);
    expect(applyHierarchyFilter(streams, 'sub-streams').map((w) => w.id)).toEqual(['child', 'closed-child']);
    expect(applyHierarchyFilter(streams, 'has-substreams').map((w) => w.id)).toEqual(['parent']);
  });

  it('groups direct children under their direct parent and keeps orphans top-level', () => {
    const groups = groupWorkstreamsByParent([child, parent, base({ id: 'orphan', name: 'Orphan', parentId: 'missing' })]);
    expect(groups.map((g) => [g.key, g.name, g.workstreams.map((w) => w.id)])).toEqual([
      ['parent', 'Parent', ['parent', 'child']],
      ['top-level', 'Top level / no parent', ['orphan']],
    ]);
  });

  it('uses explicit hierarchy timestamps for sorting', () => {
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

  it('normalizes backend hierarchy naming variants', () => {
    expect(getWorkstreamName({ id: 'source', workstreamName: 'Source Name' })).toBe('Source Name');
    expect(getDirectChildCount(base({ directChildCount: 4, childCount: 1, children: [] }))).toBe(4);
    expect(applyHierarchyFilter([base({ id: 'direct', directChildCount: 2 }), base({ id: 'none', childCount: 0 })], 'has-substreams').map((w) => w.id)).toEqual(['direct']);
  });

  it('detects obvious descendants when selecting parents', () => {
    const root = base({ id: 'root', name: 'Root', children: [{ id: 'child', name: 'Child' }] });
    const descendant = base({ id: 'grandchild', name: 'Grandchild', ancestors: [{ id: 'root', name: 'Root' }, { id: 'child', name: 'Child' }] });
    expect(isObviousDescendant(descendant, root)).toBe(true);
    expect(isObviousDescendant(base({ id: 'other', name: 'Other' }), root)).toBe(false);
  });
});
