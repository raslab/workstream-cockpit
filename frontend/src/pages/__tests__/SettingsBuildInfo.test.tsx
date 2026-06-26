import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Settings from '../Settings';
import { ThemeProvider } from '../../contexts/ThemeContext';

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings/appearance']}>
      <ThemeProvider>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Settings build metadata', () => {
  it('renders deployed branch and commit metadata in the settings chrome', () => {
    renderSettings();

    expect(screen.getByText('Deployed version')).toBeInTheDocument();
    expect(screen.getByText(/Branch:/)).toBeInTheDocument();
    expect(screen.getByText(/Commit:/)).toBeInTheDocument();
    expect(screen.getByText(/Built:/)).toBeInTheDocument();
  });
});
