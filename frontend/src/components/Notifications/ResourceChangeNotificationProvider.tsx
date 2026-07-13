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
import { getResourceChangeClientId } from '../../utils/resourceChangeClient';

type ResourceType = 'workstream' | 'status_update' | 'next_step' | 'view' | 'category' | 'tag';
type ResourceOperation =
  'created' | 'updated' | 'deleted' | 'closed' | 'reopened' | 'solved' | 'abandoned' | 'reordered';

export interface ResourceChangeNotification {
  id: string;
  resourceType: ResourceType;
  resourceId: string | null;
  resourceLabel: string | null;
  operation: ResourceOperation;
  workstreamNumber: number | null;
  changedAt: string;
  metadata?: {
    correlationId?: string;
    originClientId?: string;
    parentStreamNumbers?: number[];
  } | null;
}

interface ResourceChangeResponse {
  cursor: string | null;
  changes: ResourceChangeNotification[];
}

type ScreenRegistration =
  | { screen: 'cockpit'; workstreamNumbers?: number[] }
  | { screen: 'timeline' | 'archive' }
  | { screen: 'settings'; section?: 'views' | 'categories' | 'tags' | 'general' }
  | {
      screen: 'stream-detail';
      workstreamNumber?: number | null;
      includeSubstreamUpdates?: boolean;
    };

interface ResourceChangeNotificationContextValue {
  notifications: ResourceChangeNotification[];
  unseenCount: number;
  isCurrentScreenStale: boolean;
  staleMessage: string;
  refreshError: string | null;
  markSeen: () => void;
  refreshCurrentView: () => Promise<void>;
  registerScreen: (screen: ScreenRegistration) => () => void;
  setDirtySource: (id: string, dirty: boolean) => void;
}

const ResourceChangeNotificationContext = createContext<
  ResourceChangeNotificationContextValue | undefined
>(undefined);

const DEFAULT_POLL_INTERVAL_MS = 5000;
const RECENT_CHANGE_LIMIT = 10;
const PROCESSED_CHANGE_LIMIT = 1000;
const RECONNECT_DELAY_MS = 2000;
const isTestEnvironment = import.meta.env.MODE === 'test';

type ResourceChangeSocketMessage =
  { type: 'ready' } | { type: 'resource-change'; change: ResourceChangeNotification };

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
  if (screen.screen === 'cockpit') {
    if (!screen.workstreamNumbers) return true;
    return Boolean(
      change.workstreamNumber && screen.workstreamNumbers.includes(change.workstreamNumber),
    );
  }
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
    const isSubstream = Boolean(
      screen.workstreamNumber != null &&
      change.metadata?.parentStreamNumbers?.includes(screen.workstreamNumber),
    );
    return (
      ['category', 'tag'].includes(change.resourceType) ||
      (screen.workstreamNumber != null && change.workstreamNumber === screen.workstreamNumber) ||
      (isSubstream &&
        ((change.resourceType === 'workstream' &&
          ['created', 'closed', 'reopened', 'deleted'].includes(change.operation)) ||
          (change.resourceType === 'status_update' && Boolean(screen.includeSubstreamUpdates))))
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

export function resourceChangeSocketUrl(
  apiBaseUrl = import.meta.env.VITE_API_URL,
  origin = window.location.origin,
  clientId?: string,
): string {
  const endpoint = '/api/resource-changes/stream';
  const isAbsoluteBase = Boolean(apiBaseUrl?.match(/^[a-z][a-z\d+.-]*:\/\//i));
  const base = isAbsoluteBase ? apiBaseUrl : origin;
  const url = new URL(endpoint, base);
  if (clientId) url.searchParams.set('clientId', clientId);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function defaultCreateSocket(clientId: string): WebSocket {
  return new WebSocket(resourceChangeSocketUrl(undefined, undefined, clientId));
}

function mergeRecentChanges(
  current: ResourceChangeNotification[],
  changes: ResourceChangeNotification[],
): ResourceChangeNotification[] {
  const byId = new Map<string, ResourceChangeNotification>();
  [...changes, ...current].forEach((change) => byId.set(change.id, change));
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt))
    .slice(0, RECENT_CHANGE_LIMIT);
}

function rememberChangeId(ids: Set<string>, id: string) {
  ids.delete(id);
  ids.add(id);
  if (ids.size > PROCESSED_CHANGE_LIMIT) {
    const oldestId = ids.values().next().value;
    if (oldestId) ids.delete(oldestId);
  }
}

function groupRecentChanges(changes: ResourceChangeNotification[]) {
  const seenGroups = new Set<string>();
  return changes.filter((change) => {
    const groupId = change.metadata?.correlationId ?? change.id;
    if (seenGroups.has(groupId)) return false;
    seenGroups.add(groupId);
    return true;
  });
}

export function ResourceChangeNotificationProvider({
  children,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  fetchChanges,
  createSocket,
  clientId,
}: {
  children: ReactNode;
  pollIntervalMs?: number;
  fetchChanges?: (cursor: string | null) => Promise<ResourceChangeResponse>;
  createSocket?: () => WebSocket;
  clientId?: string;
}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [cursor, setCursor] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [notifications, setNotifications] = useState<ResourceChangeNotification[]>([]);
  const [unseenGroupIds, setUnseenGroupIds] = useState<Set<string>>(new Set());
  const [staleChangeIds, setStaleChangeIds] = useState<Set<string>>(new Set());
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const staleEligibleIdsRef = useRef(new Set<string>());
  const refreshedChangeIdsRef = useRef(new Set<string>());
  const processedChangeIdsRef = useRef(new Set<string>());
  const groupIdByChangeIdRef = useRef(new Map<string, string>());
  const staleChangesByIdRef = useRef(new Map<string, ResourceChangeNotification>());
  const dirtySourcesRef = useRef(new Map<string, boolean>());
  const screenRef = useRef<ScreenRegistration | null>(null);
  const fetcher = fetchChanges ?? fetchResourceChanges;
  const currentClientId = useMemo(() => clientId ?? getResourceChangeClientId(), [clientId]);
  const socketFactory = useMemo(
    () => createSocket ?? (() => defaultCreateSocket(currentClientId)),
    [createSocket, currentClientId],
  );
  const useRealtime = Boolean(createSocket) || !fetchChanges;

  const addChanges = useCallback(
    (changes: ResourceChangeNotification[]) => {
      const newChanges = changes.filter((change) => {
        if (processedChangeIdsRef.current.has(change.id)) return false;
        rememberChangeId(processedChangeIdsRef.current, change.id);
        return true;
      });
      if (newChanges.length === 0) return;
      setNotifications((current) => mergeRecentChanges(current, newChanges));
      const screen = screenRef.current;
      const relevantRemoteChanges = newChanges.filter(
        (change) =>
          change.metadata?.originClientId !== currentClientId &&
          !refreshedChangeIdsRef.current.has(change.id) &&
          (!screen || isChangeRelevantToScreen(change, screen)),
      );
      relevantRemoteChanges.forEach((change) => {
        staleEligibleIdsRef.current.add(change.id);
        groupIdByChangeIdRef.current.set(change.id, change.metadata?.correlationId ?? change.id);
        staleChangesByIdRef.current.set(change.id, change);
      });
      setUnseenGroupIds((groups) => {
        const next = new Set(groups);
        relevantRemoteChanges.forEach((change) =>
          next.add(change.metadata?.correlationId ?? change.id),
        );
        return next;
      });
      if (screen) {
        const relevantIds = relevantRemoteChanges.map((change) => change.id);
        if (relevantIds.length > 0) {
          setStaleChangeIds((ids) => new Set([...ids, ...relevantIds]));
        }
      }
    },
    [currentClientId],
  );

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
      data.changes.forEach((change) => rememberChangeId(processedChangeIdsRef.current, change.id));
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
        data.changes.forEach((change) =>
          rememberChangeId(processedChangeIdsRef.current, change.id),
        );
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
    staleEligibleIdsRef.current.clear();
    staleChangesByIdRef.current.clear();
    groupIdByChangeIdRef.current.clear();
    setUnseenGroupIds(new Set());
    setStaleChangeIds(new Set());
    setRefreshError(null);
  }, [location.pathname, location.search]);

  const markSeen = useCallback(() => {
    setUnseenGroupIds(new Set());
  }, []);

  const refreshCurrentView = useCallback(async () => {
    setRefreshError(null);
    const refreshingIds = new Set(staleEligibleIdsRef.current);
    try {
      await queryClient.invalidateQueries({ refetchType: 'none' });
      await queryClient.refetchQueries({ type: 'active' }, { throwOnError: true });
      refreshingIds.forEach((id) => {
        rememberChangeId(refreshedChangeIdsRef.current, id);
        staleEligibleIdsRef.current.delete(id);
        staleChangesByIdRef.current.delete(id);
        groupIdByChangeIdRef.current.delete(id);
      });
      const remainingGroups = new Set(
        Array.from(staleEligibleIdsRef.current, (id) => groupIdByChangeIdRef.current.get(id) ?? id),
      );
      setUnseenGroupIds(
        (groups) => new Set(Array.from(groups).filter((group) => remainingGroups.has(group))),
      );
      setStaleChangeIds((ids) => new Set(Array.from(ids).filter((id) => !refreshingIds.has(id))));
    } catch {
      setRefreshError('Could not refresh. Try again.');
    }
  }, [queryClient]);

  const registerScreen = useCallback((screen: ScreenRegistration) => {
    screenRef.current = screen;
    const relevantIds = new Set<string>();
    staleEligibleIdsRef.current.forEach((id) => {
      const change = staleChangesByIdRef.current.get(id);
      if (change && isChangeRelevantToScreen(change, screen)) {
        relevantIds.add(id);
        return;
      }
      staleEligibleIdsRef.current.delete(id);
      staleChangesByIdRef.current.delete(id);
      groupIdByChangeIdRef.current.delete(id);
    });
    setStaleChangeIds(relevantIds);
    return () => {
      if (screenRef.current === screen) screenRef.current = null;
    };
  }, []);

  const setDirtySource = useCallback((id: string, dirty: boolean) => {
    dirtySourcesRef.current.set(id, dirty);
    if (!dirty) {
      dirtySourcesRef.current.delete(id);
    }
  }, []);

  const staleChange = useMemo(
    () => notifications.find((change) => staleChangeIds.has(change.id)),
    [notifications, staleChangeIds],
  );

  const value = useMemo<ResourceChangeNotificationContextValue>(
    () => ({
      notifications,
      unseenCount: unseenGroupIds.size,
      isCurrentScreenStale: staleChangeIds.size > 0,
      staleMessage: staleMessageFor(staleChange),
      refreshError,
      markSeen,
      refreshCurrentView,
      registerScreen,
      setDirtySource,
    }),
    [
      markSeen,
      notifications,
      refreshCurrentView,
      refreshError,
      registerScreen,
      setDirtySource,
      staleChange,
      staleChangeIds.size,
      unseenGroupIds.size,
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
    markSeen,
    refreshCurrentView,
  } = useResourceChangeNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const displayedNotifications = useMemo(() => groupRecentChanges(notifications), [notifications]);

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
          {displayedNotifications.length === 0 ? (
            <p className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">No recent changes</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-auto">
              {displayedNotifications.map((change) => (
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

          {refreshError && (
            <p className="mt-2 rounded-md bg-red-50 px-2 py-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              {refreshError}
            </p>
          )}
        </div>
      )}

      {isCurrentScreenStale && !isOpen && (
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

          {refreshError && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">{refreshError}</p>
          )}
        </div>
      )}
    </div>
  );
}
