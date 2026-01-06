import { Navigate, Route, Routes } from 'react-router-dom';
import { SettingsSidebar } from '../components/Settings/SettingsSidebar';
import CategoryManagement from './CategoryManagement';

export default function Settings() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Settings</h1>
      
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <SettingsSidebar />
        
        {/* Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="*" element={<Navigate to="categories" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
