import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { apiClient } from '../../api/client';

type ResourceType = 'workstream' | 'status_update' | 'next_step' | 'view' | 'category' | 'tag';
type ResourceOperation =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'closed'
  | 'reopened'
  | 'solved'
  | 'abandoned'
  | 'reordered';

export interface ResourceChangeNotification {
  id: string;
  resourceType: ResourceType;
  resourceId: string | null;
  resourceLabel: string | null;
  operation: ResourceOperation;
  workstreamId: string | null;
  changedAt: string;
}

interface ResourceChangeResponse {
  cursor: string | null;
  changes: ResourceChangeNotification[];
}

type ScreenRegistration =
  | { screen: 'cockpit' | 'timeline' | 'archive' }
  | { screen: 'settings'; section?: 'views' | 'categories' | 'tags' | 'general' }
  | { screen: 'stream-detail'; workstreamId?: string | null };

interface ResourceChangeNotificationContextValue {
  notifications: ResourceChangeNotification[];
  unseenCount: number;
  isCurrentScreenStale: boolean;
  staleMessage: string;
  refreshError: string | null;
  dirtyRefreshBlocked: boolean;
  markSeen: () => void;
  refreshCurrentView: () => Promise<void>;
  registerScreen: (screen: ScreenRegistration) => () => void;
  setDirtySource: (id: string, dirty: boolean) => void;
}

const ResourceChangeNotificationContext = createContext<
  ResourceChangeNotificationContextValue | undefined
>(undefined);

const DEFAULT_POLL_INTERVAL_MS = 15000;
const MAX_NOTIFICATIONS = 10;
const RECONNECT_DELAY_MS = 2000;
const isTestEnvironment = import.meta.env.MODE === 'test';

type ResourceChangeSocketMessage =
  | { type: 'ready' }
  | { type: 'resource-change'; change: ResourceChangeNotification };

function resourceLabel(type: ResourceType): string {
  switch (type) {
    case 'workstream':
      return 'Stream';
    case 'status_update':
      return 'Status history';
    case 'next_step':
      return 'Next steps';
    case 'view':
      return 'Views';
    case 'category':
      return 'Category';
    case 'tag':
      return 'Tag';
  }
}

function operationLabel(operation: ResourceOperation): string {
  switch (operation) {
    case 'deleted':
      return 'removed';
    case 'closed':
      return 'closed';
    case 'reopened':
      return 'reopened';
    case 'created':
      return 'created';
    case 'solved':
    case 'abandoned':
    case 'reordered':
      return 'changed';
    case 'updated':
    default:
      return 'changed';
  }
}

function notificationText(change: ResourceChangeNotification): string {
  const base = `${resourceLabel(change.resourceType)} ${operationLabel(change.operation)}`;
  return change.resourceLabel ? `${base}: ${change.resourceLabel}` : base;
}

function isChangeRelevantToScreen(
  change: ResourceChangeNotification,
  screen: ScreenRegistration,
): boolean {
  if (screen.screen === 'cockpit') return true;
  if (screen.screen === 'timeline' || screen.screen === 'archive') {
    return ['workstream', 'status_update', 'category', 'tag'].includes(change.resourceType);
  }
  if (screen.screen === 'settings') {
    if (!screen.section || screen.section === 'general') {
      return ['view', 'category', 'tag'].includes(change.resourceType);
    }
    if (screen.section === 'views') return change.resourceType === 'view';
    if (screen.section === 'categories') return change.resourceType === 'category';
    if (screen.section === 'tags') return change.resourceType === 'tag';
  }
  if (screen.screen === 'stream-detail') {
    return (
      ['category', 'tag'].includes(change.resourceType) ||
      change.workstreamId === screen.workstreamId ||
      change.resourceId === screen.workstreamId
    );
  }
  return false;
}

function staleMessageFor(change: ResourceChangeNotification | undefined): string {
  if (!change) return 'Content changed. Refresh to see updates.';
  switch (change.resourceType) {
    case 'workstream':
    case 'status_update':
    case 'next_step':
      return 'Stream changed. Refresh to see updates.';
    case 'view':
      return 'Views changed. Refresh to see updates.';
    case 'category':
    case 'tag':
      return 'Settings changed. Refresh to see updates.';
    default:
      return 'Content changed. Refresh to see updates.';
  }
}

function relativeTime(value: string): string {
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true }).replace(/^about /, '');
  } catch {
    return 'just now';
  }
}

async function fetchResourceChanges(cursor: string | null): Promise<ResourceChangeResponse> {
  const response = await apiClient.get(
    `/api/resource-changes${cursor ? `?after=${encodeURIComponent(cursor)}` : ''}`,
  );
  return response.data;
}

function resourceChangeSocketUrl(): string {
  const endpoint = '/api/resource-changes/stream';
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  const url = new URL(endpoint, base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function defaultCreateSocket(): WebSocket {
  return new WebSocket(resourceChangeSocketUrl());
}

function mergeRecentChanges(
  current: ResourceChangeNotification[],
  changes: ResourceChangeNotification[],
): ResourceChangeNotification[] {
  const byId = new Map<string, ResourceChangeNotification>();
  [...changes, ...current].forEach((change) => byId.set(change.id, change));
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt))
    .slice(0, MAX_NOTIFICATIONS);
}

export function ResourceChangeNotificationProvider({
  children,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  fetchChanges,
  createSocket,
}: {
  children: ReactNode;
  pollIntervalMs?: number;
  fetchChanges?: (cursor: string | null) => Promise<ResourceChangeResponse>;
  createSocket?: () => WebSocket;
}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [cursor, setCursor] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [notifications, setNotifications] = useState<ResourceChangeNotification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [staleChangeIds, setStaleChangeIds] = useState<Set<string>>(new Set());
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [dirtyRefreshBlocked, setDirtyRefreshBlocked] = useState(false);
  const staleEligibleIdsRef = useRef(new Set<string>());
  const dirtySourcesRef = useRef(new Map<string, boolean>());
  const screenRef = useRef<ScreenRegistration | null>(null);
  const fetcher = fetchChanges ?? fetchResourceChanges;
  const socketFactory = createSocket ?? defaultCreateSocket;
  const useRealtime = Boolean(createSocket) || !fetchChanges;

  const addChanges = useCallback((changes: ResourceChangeNotification[]) => {
    if (changes.length === 0) return;
    changes.forEach((change) => staleEligibleIdsRef.current.add(change.id));
    setNotifications((current) => mergeRecentChanges(current, changes));
    setUnseenCount((count) => count + changes.length);
    const screen = screenRef.current;
    if (screen) {
      const relevantIds = changes
        .filter((change) => isChangeRelevantToScreen(change, screen))
        .map((change) => change.id);
      if (relevantIds.length > 0) {
        setStaleChangeIds((ids) => new Set([...ids, ...relevantIds]));
      }
    }
  }, []);

  const resourceChangesQuery = useQuery<ResourceChangeResponse>({
    queryKey: ['resource-changes'],
    queryFn: () => fetcher(cursor),
    refetchInterval: pollIntervalMs,
    refetchIntervalInBackground: true,
    staleTime: 0,
    enabled: !useRealtime && (!isTestEnvironment || Boolean(fetchChanges)),
  });

  useEffect(() => {
    if (useRealtime) return;
    const data = resourceChangesQuery.data;
    if (!data) return;
    if (!hasBaseline) {
      cursorRef.current = data.cursor;
      setCursor(data.cursor);
      setNotifications((current) => mergeRecentChanges(current, data.changes));
      setHasBaseline(true);
      return;
    }
    addChanges(data.changes);
    cursorRef.current = data.cursor;
    setCursor(data.cursor);
  }, [addChanges, hasBaseline, resourceChangesQuery.data, useRealtime]);

  useEffect(() => {
    if (!useRealtime) return;
    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectId: number | null = null;

    const connect = () => {
      if (closed) return;
      socket = socketFactory();
      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ResourceChangeSocketMessage;
          if (message.type !== 'resource-change') return;
          cursorRef.current = message.change.id;
          setCursor(message.change.id);
          addChanges([message.change]);
        } catch {
          // Ignore malformed realtime messages; the next reconnect/baseline fetch catches up.
        }
      });
      socket.addEventListener('close', () => {
        if (!closed) {
          reconnectId = window.setTimeout(connect, RECONNECT_DELAY_MS);
        }
      });
    };

    fetcher(cursorRef.current)
      .then((data) => {
        if (closed) return;
        cursorRef.current = data.cursor;
        setCursor(data.cursor);
        setNotifications((current) => mergeRecentChanges(current, data.changes));
        setHasBaseline(true);
        connect();
      })
      .catch(() => {
        if (!closed) reconnectId = window.setTimeout(connect, RECONNECT_DELAY_MS);
      });

    return () => {
      closed = true;
      if (reconnectId !== null) window.clearTimeout(reconnectId);
      socket?.close();
    };
  }, [addChanges, fetcher, socketFactory, useRealtime]);

  useEffect(() => {
    screenRef.current = null;
    staleEligibleIdsRef.current.clear();
    setStaleChangeIds(new Set());
    setDirtyRefreshBlocked(false);
    setRefreshError(null);
  }, [location.pathname, location.search]);

  const markSeen = useCallback(() => {
    setUnseenCount(0);
  }, []);

  const hasDirtySource = useCallback(
    () => Array.from(dirtySourcesRef.current.values()).some(Boolean),
    [],
  );

  const refreshCurrentView = useCallback(async () => {
    setRefreshError(null);
    if (hasDirtySource()) {
      setDirtyRefreshBlocked(true);
      return;
    }
    setDirtyRefreshBlocked(false);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: 'active' });
      setStaleChangeIds(new Set());
    } catch {
      setRefreshError('Could not refresh. Try again.');
    }
  }, [hasDirtySource, queryClient]);

  const registerScreen = useCallback(
    (screen: ScreenRegistration) => {
      screenRef.current = screen;
      setStaleChangeIds((ids) => {
        const relevantIds = notifications
          .filter(
            (change) =>
              staleEligibleIdsRef.current.has(change.id) && isChangeRelevantToScreen(change, screen),
          )
          .map((change) => change.id);
        return new Set([...ids, ...relevantIds]);
      });
      return () => {
        if (screenRef.current === screen) screenRef.current = null;
      };
    },
    [notifications],
  );

  const setDirtySource = useCallback((id: string, dirty: boolean) => {
    dirtySourcesRef.current.set(id, dirty);
    if (!dirty) {
      dirtySourcesRef.current.delete(id);
      setDirtyRefreshBlocked(Array.from(dirtySourcesRef.current.values()).some(Boolean));
    }
  }, []);

  const staleChange = useMemo(
    () => notifications.find((change) => staleChangeIds.has(change.id)),
    [notifications, staleChangeIds],
  );

  const value = useMemo<ResourceChangeNotificationContextValue>(
    () => ({
      notifications,
      unseenCount,
      isCurrentScreenStale: staleChangeIds.size > 0,
      staleMessage: staleMessageFor(staleChange),
      refreshError,
      dirtyRefreshBlocked,
      markSeen,
      refreshCurrentView,
      registerScreen,
      setDirtySource,
    }),
    [
      dirtyRefreshBlocked,
      markSeen,
      notifications,
      refreshCurrentView,
      refreshError,
      registerScreen,
      setDirtySource,
      staleChange,
      staleChangeIds.size,
      unseenCount,
    ],
  );

  return (
    <ResourceChangeNotificationContext.Provider value={value}>
      {children}
    </ResourceChangeNotificationContext.Provider>
  );
}

export function useResourceChangeNotifications() {
  const context = useContext(ResourceChangeNotificationContext);
  if (!context) {
    throw new Error(
      'useResourceChangeNotifications must be used within ResourceChangeNotificationProvider',
    );
  }
  return context;
}

export function useResourceChangeScreen(screen: ScreenRegistration) {
  const context = useContext(ResourceChangeNotificationContext);
  const registerScreen = context?.registerScreen;
  useEffect(() => {
    if (!registerScreen) return;
    return registerScreen(screen);
  }, [registerScreen, JSON.stringify(screen)]);
}

export function useDirtyResourceEditor(id: string, dirty: boolean) {
  const context = useContext(ResourceChangeNotificationContext);
  const setDirtySource = context?.setDirtySource;
  useEffect(() => {
    if (!setDirtySource) return;
    setDirtySource(id, dirty);
    return () => setDirtySource(id, false);
  }, [dirty, id, setDirtySource]);
}

export function NotificationCenter() {
  const {
    notifications,
    unseenCount,
    isCurrentScreenStale,
    staleMessage,
    refreshError,
    dirtyRefreshBlocked,
    markSeen,
    refreshCurrentView,
  } = useResourceChangeNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((value) => !value);
    markSeen();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        aria-label={`Notifications${unseenCount > 0 ? ` ${unseenCount}` : ''}`}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          🔔
        </span>
        {unseenCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary-600 px-1 text-center text-xs font-semibold text-white">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent changes"
          className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-2 flex items-center justify-between border-b border-gray-100 px-2 pb-2 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Recent changes
            </h2>
            {isCurrentScreenStale && (
              <button
                type="button"
                onClick={refreshCurrentView}
                className="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700"
              >
                Refresh current view
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">No recent changes</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-auto">
              {notifications.map((change) => (
                <li
                  key={change.id}
                  className="rounded-md px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {notificationText(change)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {relativeTime(change.changedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {dirtyRefreshBlocked && (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Changes are available. Save or discard your draft before refreshing.
            </p>
          )}
          {refreshError && (
            <p className="mt-2 rounded-md bg-red-50 px-2 py-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              {refreshError}
            </p>
          )}
        </div>
      )}

      {isCurrentScreenStale && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-primary-200 bg-white p-3 shadow-lg dark:border-primary-800 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{staleMessage}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={refreshCurrentView}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Refresh
            </button>
          </div>
          {dirtyRefreshBlocked && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Changes are available. Save or discard your draft before refreshing.
            </p>
          )}
          {refreshError && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">{refreshError}</p>
          )}
        </div>
      )}
    </div>
  );
}
