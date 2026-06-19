import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Settings from '../Settings';
import { ThemeProvider } from '../../contexts/ThemeContext';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderSettingsAppearance() {
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

describe('Settings appearance preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('adds an appearance settings section with System as the default color theme', () => {
    renderSettingsAppearance();

    expect(screen.getByRole('link', { name: /appearance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /appearance/i })).toBeInTheDocument();
    expect(screen.getByText(/visual preferences/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system/i)).toBeChecked();
  });

  it('updates and persists the color theme preference from settings', () => {
    renderSettingsAppearance();

    act(() => {
      fireEvent.click(screen.getByLabelText(/dark/i));
    });

    expect(screen.getByLabelText(/dark/i)).toBeChecked();
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('workstream-cockpit-theme')).toBe('dark');

    act(() => {
      fireEvent.click(screen.getByLabelText(/light/i));
    });

    expect(screen.getByLabelText(/light/i)).toBeChecked();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('workstream-cockpit-theme')).toBe('light');
  });
});
