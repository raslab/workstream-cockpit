import { ReactNode } from 'react';
import Header from './Header';
import { ResourceChangeNotificationProvider } from '../Notifications/ResourceChangeNotificationProvider';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:bg-gray-900">
      <ResourceChangeNotificationProvider>
        <Header />
        <main>{children}</main>
      </ResourceChangeNotificationProvider>
    </div>
  );
}
