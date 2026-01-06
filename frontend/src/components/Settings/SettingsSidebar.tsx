import { NavLink } from 'react-router-dom';

interface SettingsTab {
  name: string;
  href: string;
  icon: string;
}

const settingsTabs: SettingsTab[] = [
  { name: 'Categories', href: '/settings/categories', icon: '🏷️' },
  // Future tabs can be added here:
  // { name: 'Preferences', href: '/settings/preferences', icon: '⚙️' },
  // { name: 'Integrations', href: '/settings/integrations', icon: '🔌' },
  // { name: 'Account', href: '/settings/account', icon: '👤' },
];

export function SettingsSidebar() {
  return (
    <nav className="w-64 flex-shrink-0">
      <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        {settingsTabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.name}</span>
          </NavLink>
        ))}
      </div>
      
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <strong>💡 Tip:</strong> Settings are organized by category. More options will be added here over time.
      </div>
    </nav>
  );
}
