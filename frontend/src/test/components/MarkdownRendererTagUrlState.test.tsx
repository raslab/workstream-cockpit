import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownRenderer } from '../../components/Markdown/MarkdownRenderer';

vi.mock('../../api/tags', () => ({
  useTags: () => ({
    data: [
      { name: 'security', displayName: 'Security', color: '#dc2626' },
      { name: 'frontend', displayName: 'Frontend', color: '#3b82f6' },
    ],
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}|state:{JSON.stringify(location.state)}</div>;
}

function renderAt(initialEntry: string, content = 'Latest update references #security') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<><MarkdownRenderer content={content} /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MarkdownRenderer inline hashtag URL navigation', () => {
  it('adds inline update tags to existing cockpit filters without dropping other URL state', () => {
    renderAt('/?view=platform&tags=frontend&categories=operations&sort=name%3Aasc');

    fireEvent.click(screen.getByRole('button', { name: '#Security' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/?view=platform&tags=frontend%2Csecurity&categories=operations&sort=name%3Aasc|state:null');
  });

  it('adds inline timeline tags to current timeline filters without leaving timeline', () => {
    renderAt('/timeline?tags=frontend&scope=under-parent&parentId=parent-1&activity=status_update');

    fireEvent.click(screen.getByRole('button', { name: '#Security' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/timeline?tags=frontend%2Csecurity&scope=under-parent&parentId=parent-1&activity=status_update|state:null');
  });
});
