import { NavLink } from 'react-router-dom';

interface SettingsTab {
  name: string;
  href: string;
  icon: string;
}

const settingsTabs: SettingsTab[] = [
  { name: 'Categories', href: '/settings/categories', icon: '🏷️' },
  { name: 'Tags', href: '/settings/tags', icon: '#️⃣' },
  { name: 'Personal access tokens', href: '/settings/personal-access-tokens', icon: '🔑' },
  { name: 'Appearance', href: '/settings/appearance', icon: '🎨' },
  // Future tabs can be added here:
  // { name: 'Preferences', href: '/settings/preferences', icon: '⚙️' },
  // { name: 'Integrations', href: '/settings/integrations', icon: '🔌' },
  // { name: 'Account', href: '/settings/account', icon: '👤' },
];

export function SettingsSidebar() {
  return (
    <nav className="w-64 flex-shrink-0">
      <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {settingsTabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-100'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
