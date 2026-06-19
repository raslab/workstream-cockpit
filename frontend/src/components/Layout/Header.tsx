import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Cockpit' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/archive', label: 'Archive' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <img
              src="/workstream-cockpit-icon.svg"
              alt=""
              aria-hidden="true"
              className="mr-3 h-8 w-8 rounded-lg"
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Workstream Cockpit</h1>
            
            {user && (
              <nav className="ml-10 flex space-x-4">
                {navItems.map((item) => {
                  const isActive = item.path === '/' 
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-100'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:text-gray-300'
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
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-200 dark:text-gray-300">{user.name}</span>
              <button
                onClick={logout}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
