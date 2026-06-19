import { ThemePreference, useTheme } from '../contexts/ThemeContext';

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device color theme automatically.',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Use the day theme with light surfaces.',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the night theme with dark surfaces.',
  },
];

export default function AppearanceSettings() {
  const { resolvedTheme, setThemePreference, themePreference } = useTheme();

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Visual preferences for Workstream Cockpit, including color theme. Future localization,
          font size, and color controls can live here.
        </p>
      </div>

      <fieldset>
        <legend className="text-base font-medium text-gray-900 dark:text-gray-100">Color theme</legend>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Choose System, Light, or Dark. Current effective theme: {resolvedTheme}.
        </p>

        <div className="mt-4 space-y-3">
          {themeOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/60"
            >
              <input
                type="radio"
                name="color-theme"
                value={option.value}
                checked={themePreference === option.value}
                onChange={() => setThemePreference(option.value)}
                className="mt-1 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </span>
                <span className="block text-sm text-gray-600 dark:text-gray-300">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
