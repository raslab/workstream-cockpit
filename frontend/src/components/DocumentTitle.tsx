import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const APP_NAME = 'Workstream Cockpit';
const MAX_DYNAMIC_TITLE_LENGTH = 40;

export function shortenDocumentTitleText(text: string): string {
  if (text.length <= MAX_DYNAMIC_TITLE_LENGTH) return text;
  return `${text.slice(0, MAX_DYNAMIC_TITLE_LENGTH - 3)}...`;
}

export function formatDocumentTitle(pageName: string): string {
  return `${pageName} — ${APP_NAME}`;
}

export function useDocumentTitle(pageName: string): void {
  useEffect(() => {
    document.title = formatDocumentTitle(pageName);
  }, [pageName]);
}

function pageNameForPath(pathname: string): string {
  if (pathname === '/') return 'Cockpit';
  if (pathname === '/timeline') return 'Timeline';
  if (pathname === '/archive') return 'Archive';
  if (pathname === '/login') return 'Login';
  if (pathname === '/auth/callback') return 'Login';
  if (pathname.startsWith('/workstreams/')) return 'Workstream';
  if (pathname.startsWith('/settings/appearance')) return 'Appearance';
  if (pathname.startsWith('/settings/personal-access-tokens')) return 'Personal Access Tokens';
  if (pathname.startsWith('/settings/tags')) return 'Tags';
  if (pathname.startsWith('/settings')) return 'Categories';
  return APP_NAME;
}

export function RouteDocumentTitle() {
  const { pathname } = useLocation();
  useDocumentTitle(pageNameForPath(pathname));
  return null;
}
