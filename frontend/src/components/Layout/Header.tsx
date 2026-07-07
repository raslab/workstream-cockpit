import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from '../Notifications/ResourceChangeNotificationProvider';

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Cockpit' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/archive', label: 'Archive' },
  ];

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <img
              src="/workstream-cockpit-icon.svg"
              alt=""
              aria-hidden="true"
              className="mr-3 h-8 w-8 rounded-lg"
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Workstream Cockpit
            </h1>

            {user && (
              <nav aria-label="Primary" className="ml-10 flex space-x-4">
                {navItems.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-100'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-3">
              <NotificationCenter />
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Account menu for ${user.name}`}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsAccountOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-semibold text-primary-700 ring-1 ring-gray-200 hover:ring-primary-300 dark:bg-primary-900 dark:text-primary-100 dark:ring-gray-700"
                >
                  {user.pictureUrl ? (
                    <img
                      src={user.pictureUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">{initials(user.name)}</span>
                  )}
                </button>

                {isAccountOpen && (
                  <div
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </div>
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                    <Link
                      role="menuitem"
                      to="/settings"
                      onClick={() => setIsAccountOpen(false)}
                      className="mt-1 block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Settings
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={logout}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
