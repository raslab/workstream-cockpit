import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TagChip } from '../../components/Tag/TagChip';

vi.mock('../../api/tags', () => ({
  useTags: () => ({ data: [{ name: 'frontend', displayName: 'Frontend', color: '#3b82f6' }] }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}|state:{JSON.stringify(location.state)}</div>;
}

function renderAt(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<><TagChip tagName="frontend" /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TagChip URL navigation', () => {
  it('adds the tag to existing cockpit URL filters without dropping other params or using location state', () => {
    renderAt('/?view=platform&tags=backend&categories=operations&sort=name%3Aasc');

    fireEvent.click(screen.getByRole('button', { name: '#Frontend' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/?view=platform&tags=backend%2Cfrontend&categories=operations&sort=name%3Aasc|state:null');
  });

  it('adds the tag to timeline filters while staying on the timeline page', () => {
    renderAt('/timeline?tags=priority&scope=under-parent&parentId=parent-1');

    fireEvent.click(screen.getByRole('button', { name: '#Frontend' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/timeline?tags=frontend%2Cpriority&scope=under-parent&parentId=parent-1|state:null');
  });
});
