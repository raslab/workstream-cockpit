import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') listeners.add(listener);
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') listeners.delete(listener);
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  return {
    setSystemDark(nextMatches: boolean) {
      listeners.forEach((listener) =>
        listener({ matches: nextMatches, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent),
      );
    },
  };
}

function ThemeHarness() {
  const { resolvedTheme, setThemePreference, themePreference } = useTheme();

  return (
    <div>
      <p>Preference: {themePreference}</p>
      <p>Resolved: {resolvedTheme}</p>
      <button onClick={() => setThemePreference('dark')}>Dark</button>
      <button onClick={() => setThemePreference('light')}>Light</button>
      <button onClick={() => setThemePreference('system')}>System</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to system preference and applies dark when the OS is dark', () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('workstream-cockpit-theme')).toBeNull();
  });

  it('dark preference adds the document dark class and persists to localStorage', () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    });

    expect(screen.getByText('Preference: dark')).toBeInTheDocument();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('workstream-cockpit-theme')).toBe('dark');
  });

  it('light preference removes the document dark class and persists to localStorage', () => {
    mockMatchMedia(true);
    localStorage.setItem('workstream-cockpit-theme', 'dark');
    document.documentElement.classList.add('dark');
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    });

    expect(screen.getByText('Preference: light')).toBeInTheDocument();
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('workstream-cockpit-theme')).toBe('light');
  });

  it('system preference follows OS changes and removes persisted override', () => {
    const matchMedia = mockMatchMedia(false);
    localStorage.setItem('workstream-cockpit-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'System' }));
    });

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('workstream-cockpit-theme')).toBeNull();

    act(() => {
      matchMedia.setSystemDark(true);
    });

    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('defaults to system preference and still renders when storage read throws', () => {
    mockMatchMedia(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('does not crash when storage write or remove throws while changing theme', () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage write unavailable');
    });

    expect(() => {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
      });
    }).not.toThrow();

    expect(screen.getByText('Preference: dark')).toBeInTheDocument();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage remove unavailable');
    });

    expect(() => {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'System' }));
      });
    }).not.toThrow();

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('defaults resolved theme to light and does not crash when matchMedia is missing', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: light')).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('defaults invalid stored preferences to system', () => {
    mockMatchMedia(true);
    localStorage.setItem('workstream-cockpit-theme', 'sepia');

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });
});
