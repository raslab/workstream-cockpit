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

describe('TagChip URL navigation', () => {
  it('navigates to cockpit with a tags search param instead of location state', () => {
    render(
      <MemoryRouter initialEntries={['/timeline']}>
        <Routes>
          <Route path="*" element={<><TagChip tagName="frontend" /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '#Frontend' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/?tags=frontend|state:null');
  });
});
