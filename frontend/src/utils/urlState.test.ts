import { describe, expect, it } from 'vitest';
import type { ViewConfig } from '../types/view';
import {
  applyCockpitSearchToConfig,
  dateToUrlDate,
  parseTimelineSearch,
  serializeCockpitConfigSearch,
  serializeTimelineSearch,
  urlDateToDate,
} from './urlState';

const baseConfig: ViewConfig['config'] = {
  filters: {
    categoryIds: [],
    tags: [],
    temporal: { notUpdatedToday: false },
    hierarchy: {
      mode: 'all',
      parentId: null,
      includeSubstreams: false,
      timelineScope: 'all',
      includeStructuralEvents: true,
    },
  },
  sort: { field: 'lastActivityAt', direction: 'desc' },
  group: { by: 'category' },
};

describe('urlState cockpit helpers', () => {
  it('applies valid URL overrides to a saved view config and ignores invalid enum values', () => {
    const next = applyCockpitSearchToConfig(
      baseConfig,
      new URLSearchParams('tags=backend,frontend&categoryIds=cat-2,cat-1&notUpdatedToday=1&hierarchy=top-level&includeSubstreams=1&sort=name:asc&group=parent&bad=x')
    );

    expect(next.filters.tags).toEqual(['backend', 'frontend']);
    expect(next.filters.categoryIds).toEqual(['cat-2', 'cat-1']);
    expect(next.filters.temporal.notUpdatedToday).toBe(true);
    expect(next.filters.hierarchy.mode).toBe('top-level');
    expect(next.filters.hierarchy.includeSubstreams).toBe(true);
    expect(next.sort).toEqual({ field: 'name', direction: 'asc' });
    expect(next.group).toEqual({ by: 'parent' });

    const invalid = applyCockpitSearchToConfig(baseConfig, new URLSearchParams('hierarchy=bogus&sort=bogus:sideways&group=bogus'));
    expect(invalid).toEqual(baseConfig);
  });

  it('serializes only config differences from the selected view using stable comma-separated arrays', () => {
    const customized: ViewConfig['config'] = {
      ...baseConfig,
      filters: {
        ...baseConfig.filters,
        tags: ['frontend', 'backend'],
        categoryIds: ['cat-2', 'cat-1'],
        temporal: { notUpdatedToday: true },
        hierarchy: { ...baseConfig.filters.hierarchy, mode: 'top-level', includeSubstreams: true },
      },
      sort: { field: 'name', direction: 'asc' },
      group: { by: 'parent' },
    };

    expect(serializeCockpitConfigSearch('view-1', customized, baseConfig).toString()).toBe(
      'view=view-1&tags=backend%2Cfrontend&categories=cat-1%2Ccat-2&notUpdatedToday=1&hierarchy=top-level&includeSubstreams=1&sort=name%3Aasc&group=parent'
    );
    expect(serializeCockpitConfigSearch('view-1', baseConfig, baseConfig).toString()).toBe('view=view-1');
  });

  it('round-trips explicit cleared filters and false booleans over a non-empty saved view', () => {
    const savedViewConfig: ViewConfig['config'] = {
      ...baseConfig,
      filters: {
        ...baseConfig.filters,
        tags: ['backend'],
        categoryIds: ['cat-1'],
        temporal: { notUpdatedToday: true },
        hierarchy: { ...baseConfig.filters.hierarchy, includeSubstreams: true, parentId: 'parent-1' },
      },
    };
    const clearedConfig: ViewConfig['config'] = {
      ...savedViewConfig,
      filters: {
        ...savedViewConfig.filters,
        tags: [],
        categoryIds: [],
        temporal: { notUpdatedToday: false },
        hierarchy: { ...savedViewConfig.filters.hierarchy, includeSubstreams: false, parentId: null },
      },
    };

    const serialized = serializeCockpitConfigSearch('view-1', clearedConfig, savedViewConfig);
    expect(serialized.toString()).toBe('view=view-1&tags=&categories=&notUpdatedToday=0&parentId=&includeSubstreams=0');
    expect(applyCockpitSearchToConfig(savedViewConfig, serialized)).toEqual(clearedConfig);
  });
});

describe('urlState timeline helpers', () => {
  it('parses and serializes timeline filters while dropping invalid enum values and defaults', () => {
    const parsed = parseTimelineSearch(new URLSearchParams('tags=backend,frontend&categoryIds=cat-1&startDate=2026-06-01&endDate=2026-06-22&scope=under-parent&parentId=parent-1&includeSubstreams=1&activity=parent_changed'));

    expect(parsed).toEqual({
      tags: ['backend', 'frontend'],
      categoryIds: ['cat-1'],
      quickPreset: undefined,
      startDate: '2026-06-01',
      endDate: '2026-06-22',
      streamScope: 'under-parent',
      parentId: 'parent-1',
      includeSubstreams: true,
      activity: 'parent_changed',
    });

    expect(serializeTimelineSearch(parsed).toString()).toBe(
      'tags=backend%2Cfrontend&categories=cat-1&startDate=2026-06-01&endDate=2026-06-22&scope=under-parent&parentId=parent-1&includeSubstreams=1&activity=parent_changed'
    );
    expect(parseTimelineSearch(new URLSearchParams('scope=nope&activity=nope&includeSubstreams=0'))).toEqual({
      tags: [],
      categoryIds: [],
      quickPreset: 'last-7-days',
      startDate: undefined,
      endDate: undefined,
      streamScope: 'all',
      includeSubstreams: false,
      activity: 'all',
      parentId: undefined,
    });

    const customRange = parseTimelineSearch(new URLSearchParams('range=last-30-days'));
    expect(customRange.quickPreset).toBe('last-30-days');
    expect(serializeTimelineSearch(customRange).toString()).toBe('range=last-30-days');
  });

  it('ignores invalid URL date values instead of creating invalid Date objects', () => {
    const parsed = parseTimelineSearch(new URLSearchParams('startDate=not-a-date&endDate=2026-13-40'));

    expect(parsed.startDate).toBeUndefined();
    expect(parsed.endDate).toBeUndefined();
    expect(urlDateToDate(parsed.startDate)).toBeUndefined();
    expect(urlDateToDate(parsed.endDate)).toBeUndefined();
  });

  it('serializes and parses date-only values using local calendar days', () => {
    const localDate = new Date(2026, 5, 1);

    expect(dateToUrlDate(localDate)).toBe('2026-06-01');
    expect(urlDateToDate('2026-06-01')).toEqual(localDate);
  });
});
