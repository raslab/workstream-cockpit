# Appearance and theme preferences

## Purpose

Workstream Cockpit provides browser-local visual preferences so users can choose a comfortable color theme without requiring backend schema or account-preference changes.

The first visual preference is the color theme. The settings area is intentionally named **Appearance** so future visual controls such as localization, font size, and color customization can live in the same section.

## User-facing behavior

- Settings exposes an **Appearance** section at `/settings/appearance`.
- The color theme options are:
  - **System** — follow the browser/OS `prefers-color-scheme` value.
  - **Light** — force the light/day theme.
  - **Dark** — force the dark/night theme.
- The default preference is **System**.
- The settings page displays the current effective resolved theme.
- The preference is local to the current browser and is not synced through the backend.

## Persistence and bootstrap

- Explicit `light` and `dark` selections are stored in `localStorage` under `workstream-cockpit-theme`.
- Selecting `system` removes the stored override, making system behavior the default.
- Invalid stored values are treated as `system`.
- Storage access is best-effort: blocked or throwing `localStorage` must not prevent the app from rendering or the in-memory theme state from changing.
- `frontend/index.html` applies the initial `dark` class before React loads to reduce theme flash.
- The bootstrap script must guard `localStorage` and `matchMedia` access because either can be unavailable or throw in restricted browser contexts.

## Implementation references

- `frontend/tailwind.config.js` sets `darkMode: 'class'`.
- `frontend/index.html` contains the pre-React bootstrap script.
- `frontend/src/contexts/ThemeContext.tsx` owns:
  - `ThemePreference = 'system' | 'light' | 'dark'`
  - `ResolvedTheme = 'light' | 'dark'`
  - `themePreference`
  - `resolvedTheme`
  - `setThemePreference()`
- `frontend/src/App.tsx` wraps the app in `ThemeProvider`.
- `frontend/src/pages/AppearanceSettings.tsx` renders the Appearance settings UI.
- `frontend/src/components/Settings/SettingsSidebar.tsx` links to the Appearance section.

## Regression tests

- `frontend/src/contexts/ThemeContext.test.tsx` covers:
  - default system behavior
  - dark/light preference application
  - `html.dark` class toggling
  - localStorage persistence and clearing
  - OS color-scheme changes while in system mode
  - invalid stored preference fallback
  - blocked/throwing storage behavior
  - missing `matchMedia` fallback
- `frontend/src/pages/__tests__/AppearanceSettings.test.tsx` covers:
  - Appearance route/sidebar visibility
  - System default selection
  - Settings controls updating and persisting the selected theme

## Verification commands

From `frontend/`:

```bash
npm test -- src/contexts/ThemeContext.test.tsx src/pages/__tests__/AppearanceSettings.test.tsx
npm test
npm run lint
npm run build
```
