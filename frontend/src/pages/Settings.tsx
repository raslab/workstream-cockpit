import { Navigate, Route, Routes } from 'react-router-dom';
import { BuildInfoBadge } from '../components/Settings/BuildInfoBadge';
import { SettingsSidebar } from '../components/Settings/SettingsSidebar';
import AppearanceSettings from './AppearanceSettings';
import CategoryManagement from './CategoryManagement';
import PersonalAccessTokens from './PersonalAccessTokens';
import TagManagement from './TagManagement';

export default function Settings() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <BuildInfoBadge />
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <SettingsSidebar />

        {/* Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="tags" element={<TagManagement />} />
            <Route path="personal-access-tokens" element={<PersonalAccessTokens />} />
            <Route path="appearance" element={<AppearanceSettings />} />
            <Route path="*" element={<Navigate to="categories" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
