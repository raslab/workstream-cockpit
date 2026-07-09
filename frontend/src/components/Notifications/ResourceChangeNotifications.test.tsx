import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationCenter,
  ResourceChangeNotification,
  ResourceChangeNotificationProvider,
  resourceChangeSocketUrl,
  useDirtyResourceEditor,
  useResourceChangeScreen,
} from './ResourceChangeNotificationProvider';

const invalidateQueriesMock = vi.fn();
const refetchQueriesMock = vi.fn();
const fetchChangesMock = vi.fn();

class FakeResourceChangeSocket extends EventTarget {
  static instances: FakeResourceChangeSocket[] = [];
  sent: string[] = [];

  constructor() {
    super();
    FakeResourceChangeSocket.instances.push(this);
  }

  send(message: string) {
    this.sent.push(message);
  }

  close() {
    this.dispatchEvent(new CloseEvent('close'));
  }

  emitChange(change: ResourceChangeNotification) {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify({ type: 'resource-change', change }) }),
    );
  }
}

function ScreenRegistration({ dirty = false }: { dirty?: boolean }) {
  useResourceChangeScreen({ screen: 'stream-detail', workstreamId: 'stream-1' });
  useDirtyResourceEditor('test-editor', dirty);
  return <div>Screen content</div>;
}

function CockpitRegistration() {
  useResourceChangeScreen({ screen: 'cockpit', workstreamIds: ['stream-1'] });
  return <div>Cockpit content</div>;
}

function MultiDirtyRegistration({
  firstDirty,
  secondDirty,
}: {
  firstDirty: boolean;
  secondDirty: boolean;
}) {
  useResourceChangeScreen({ screen: 'stream-detail', workstreamId: 'stream-1' });
  useDirtyResourceEditor('first-editor', firstDirty);
  useDirtyResourceEditor('second-editor', secondDirty);
  return <div>Screen content</div>;
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.invalidateQueries = invalidateQueriesMock as typeof queryClient.invalidateQueries;
  queryClient.refetchQueries = refetchQueriesMock as typeof queryClient.refetchQueries;
  invalidateQueriesMock.mockResolvedValue(undefined);
  refetchQueriesMock.mockResolvedValue(undefined);
  return queryClient;
}

function renderNotifications({ dirty = false } = {}) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/workstreams/1']}>
        <ResourceChangeNotificationProvider pollIntervalMs={25} fetchChanges={fetchChangesMock}>
          <NotificationCenter />
          <ScreenRegistration dirty={dirty} />
        </ResourceChangeNotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderRealtimeNotifications() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/workstreams/1']}>
        <ResourceChangeNotificationProvider
          fetchChanges={fetchChangesMock}
          createSocket={() => new FakeResourceChangeSocket() as unknown as WebSocket}
        >
          <NotificationCenter />
          <ScreenRegistration />
        </ResourceChangeNotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderRealtimeNotificationsForOwnClient() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/workstreams/1']}>
        <ResourceChangeNotificationProvider
          fetchChanges={fetchChangesMock}
          createSocket={() => new FakeResourceChangeSocket() as unknown as WebSocket}
          clientId="client-1"
        >
          <NotificationCenter />
          <ScreenRegistration />
        </ResourceChangeNotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderRealtimeCockpitNotifications() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <ResourceChangeNotificationProvider
          fetchChanges={fetchChangesMock}
          createSocket={() => new FakeResourceChangeSocket() as unknown as WebSocket}
        >
          <NotificationCenter />
          <CockpitRegistration />
        </ResourceChangeNotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderMultiDirtyNotifications(firstDirty: boolean, secondDirty: boolean) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/workstreams/1']}>
        <ResourceChangeNotificationProvider pollIntervalMs={25} fetchChanges={fetchChangesMock}>
          <NotificationCenter />
          <MultiDirtyRegistration firstDirty={firstDirty} secondDirty={secondDirty} />
        </ResourceChangeNotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('resource change notifications', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    FakeResourceChangeSocket.instances = [];
    fetchChangesMock.mockResolvedValue({ cursor: 'baseline', changes: [] });
  });

  it('builds same-origin websocket URLs when API base is relative', () => {
    expect(resourceChangeSocketUrl('/', 'http://localhost:3002')).toBe(
      'ws://localhost:3002/api/resource-changes/stream',
    );
    expect(resourceChangeSocketUrl(undefined, 'https://cockpit.example.test')).toBe(
      'wss://cockpit.example.test/api/resource-changes/stream',
    );
  });

  it('uses a realtime socket after baseline instead of polling HTTP every interval', async () => {
    renderRealtimeNotifications();
    await waitFor(() => expect(fetchChangesMock).toHaveBeenCalledWith(null));
    expect(FakeResourceChangeSocket.instances).toHaveLength(1);

    const change: ResourceChangeNotification = {
      id: 'change-1',
      resourceType: 'status_update',
      resourceId: 'update-1',
      resourceLabel: null,
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
    };
    FakeResourceChangeSocket.instances[0].emitChange(change);

    await waitFor(() =>
      expect(screen.getByText('Stream changed. Refresh to see updates.')).toBeInTheDocument(),
    );
    expect(fetchChangesMock).toHaveBeenCalledTimes(1);
  });

  it('counts correlated complex operations once on the badge', async () => {
    renderRealtimeNotifications();
    await waitFor(() => expect(FakeResourceChangeSocket.instances).toHaveLength(1));

    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-1',
      resourceType: 'next_step',
      resourceId: 'step-1',
      resourceLabel: 'Ship realtime',
      operation: 'solved',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
      metadata: { correlationId: 'tx-1' },
    });
    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-2',
      resourceType: 'status_update',
      resourceId: 'update-1',
      resourceLabel: 'Solved next step: Ship realtime',
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:01.000Z',
      metadata: { correlationId: 'tx-1' },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /notifications/i })).toHaveTextContent('1'),
    );
  });

  it('does not count or prompt for changes made by this browser tab', async () => {
    renderRealtimeNotificationsForOwnClient();
    await waitFor(() => expect(FakeResourceChangeSocket.instances).toHaveLength(1));

    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-1',
      resourceType: 'status_update',
      resourceId: 'update-1',
      resourceLabel: 'Local update',
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
      metadata: { originClientId: 'client-1' },
    });

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('button', { name: /notifications/i })).not.toHaveTextContent('1');
    expect(screen.queryByText('Stream changed. Refresh to see updates.')).not.toBeInTheDocument();
    expect(screen.getByText('Status history created: Local update')).toBeInTheDocument();
  });

  it('counts badge groups only for resources visible on the current cockpit page', async () => {
    renderRealtimeCockpitNotifications();
    await waitFor(() => expect(FakeResourceChangeSocket.instances).toHaveLength(1));

    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-1',
      resourceType: 'workstream',
      resourceId: 'stream-2',
      resourceLabel: 'Hidden stream',
      operation: 'updated',
      workstreamId: 'stream-2',
      changedAt: '2026-07-07T10:00:00.000Z',
    });
    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-2',
      resourceType: 'status_update',
      resourceId: 'update-1',
      resourceLabel: 'Visible update',
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:01.000Z',
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /notifications/i })).toHaveTextContent('1'),
    );
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Stream changed: Hidden stream')).toBeInTheDocument();
    expect(screen.getByText('Status history created: Visible update')).toBeInTheDocument();
  });

  it('loads historical changes during realtime baseline and still opens the socket', async () => {
    const historicalChange: ResourceChangeNotification = {
      id: 'historical-change-1',
      resourceType: 'category',
      resourceId: 'category-1',
      resourceLabel: 'Projects',
      operation: 'updated',
      workstreamId: null,
      changedAt: '2026-07-07T09:00:00.000Z',
    };
    fetchChangesMock.mockResolvedValue({
      cursor: 'historical-change-1',
      changes: [historicalChange],
    });

    renderRealtimeNotifications();

    await waitFor(() => expect(FakeResourceChangeSocket.instances).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText('Category changed: Projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications/i })).not.toHaveTextContent('1');
    expect(screen.queryByText('Settings changed. Refresh to see updates.')).not.toBeInTheDocument();
  });

  it('shows unseen source-neutral notifications and a current-screen refresh popup', async () => {
    renderNotifications();
    await waitFor(() => expect(fetchChangesMock).toHaveBeenCalledWith(null));

    const change: ResourceChangeNotification = {
      id: 'change-1',
      resourceType: 'status_update',
      resourceId: 'update-1',
      resourceLabel: null,
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
    };
    fetchChangesMock.mockResolvedValue({ cursor: 'change-1', changes: [change] });
    await waitFor(() => expect(fetchChangesMock).toHaveBeenCalledWith('baseline'));

    await waitFor(() =>
      expect(screen.getByText('Stream changed. Refresh to see updates.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveTextContent('1');

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByText('Stream changed. Refresh to see updates.')).not.toBeInTheDocument();
    expect(screen.getByText('Status history created')).toBeInTheDocument();
    expect(screen.getByText('Refresh current view')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /recent changes/i })).toHaveClass('z-50');
  });

  it('clears the current refresh badge after a successful manual refresh', async () => {
    renderRealtimeNotifications();
    await waitFor(() => expect(FakeResourceChangeSocket.instances).toHaveLength(1));

    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-1',
      resourceType: 'status_update',
      resourceId: 'update-1',
      resourceLabel: null,
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
    });

    await waitFor(() =>
      expect(screen.getByText('Stream changed. Refresh to see updates.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveTextContent('1');

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(refetchQueriesMock).toHaveBeenCalledWith({ type: 'active' }));
    expect(screen.queryByText('Stream changed. Refresh to see updates.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^notifications$/i })).not.toHaveTextContent('1');

    FakeResourceChangeSocket.instances[0].emitChange({
      id: 'change-2',
      resourceType: 'status_update',
      resourceId: 'update-2',
      resourceLabel: null,
      operation: 'created',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:01:00.000Z',
    });

    await waitFor(() =>
      expect(screen.getByText('Stream changed. Refresh to see updates.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /notifications/i })).toHaveTextContent('1');
  });

  it('keeps refresh blocked until every dirty editor is cleared', async () => {
    const rendered = renderMultiDirtyNotifications(true, true);
    await waitFor(() => expect(fetchChangesMock).toHaveBeenCalledWith(null));

    const change: ResourceChangeNotification = {
      id: 'change-1',
      resourceType: 'workstream',
      resourceId: 'stream-1',
      resourceLabel: 'English fluency practice',
      operation: 'updated',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
    };
    fetchChangesMock.mockResolvedValue({ cursor: 'change-1', changes: [change] });
    await waitFor(() =>
      expect(screen.getByText('Stream changed. Refresh to see updates.')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(
      screen.getByText('Changes are available. Save or discard your draft before refreshing.'),
    ).toBeInTheDocument();

    rendered.rerender(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/workstreams/1']}>
          <ResourceChangeNotificationProvider pollIntervalMs={25} fetchChanges={fetchChangesMock}>
            <NotificationCenter />
            <MultiDirtyRegistration firstDirty={false} secondDirty />
          </ResourceChangeNotificationProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByText('Changes are available. Save or discard your draft before refreshing.'),
    ).toBeInTheDocument();
  });

  it('blocks refresh while dirty editor state is registered', async () => {
    renderNotifications({ dirty: true });
    await waitFor(() => expect(fetchChangesMock).toHaveBeenCalledWith(null));

    const change: ResourceChangeNotification = {
      id: 'change-1',
      resourceType: 'workstream',
      resourceId: 'stream-1',
      resourceLabel: 'English fluency practice',
      operation: 'updated',
      workstreamId: 'stream-1',
      changedAt: '2026-07-07T10:00:00.000Z',
    };
    fetchChangesMock.mockResolvedValue({ cursor: 'change-1', changes: [change] });
    await waitFor(() =>
      expect(screen.getByText('Stream changed. Refresh to see updates.')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(
      screen.getByText('Changes are available. Save or discard your draft before refreshing.'),
    ).toBeInTheDocument();
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
    expect(refetchQueriesMock).not.toHaveBeenCalled();
  });
});
