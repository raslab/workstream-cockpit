import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ViewControls } from '../../components/ViewManagement/ViewControls';
import type { ViewConfig } from '../../types/view';

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

describe('ViewControls', () => {
  it('creates a high stacking context so dropdowns overlay workstream cards', () => {
    render(
      <ViewControls
        config={baseConfig}
        onConfigChange={vi.fn()}
        hasUnsavedChanges={false}
        onSave={vi.fn()}
        onSaveAs={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    const controlsBar = screen.getByTestId('view-controls-bar');
    expect(controlsBar).toHaveClass('relative');
    expect(controlsBar).toHaveClass('z-40');
  });
});
