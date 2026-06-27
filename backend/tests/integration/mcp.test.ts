import request from 'supertest';
import express from 'express';
import { createMcpRouter } from '../../src/mcp/server';
import { createPersonalAccessToken } from '../../src/services/personalAccessTokenService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestCategory,
  createTestTag,
  createTestWorkstream,
  createTestStatusUpdate,
  prisma,
} from '../helpers/testDb';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/mcp', createMcpRouter());
  return app;
}

async function pat(personId: string, scopes: string[] = ['mcp:read', 'mcp:write']) {
  return (await createPersonalAccessToken(personId, { name: `test-${scopes.join('-')}`, scopes }))
    .token;
}

function rpc(method: string, params?: any, id: any = 1) {
  return { jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) };
}

function callTool(app: express.Express, token: string, name: string, args: any = {}) {
  return request(app)
    .post('/mcp')
    .set('Authorization', `Bearer ${token}`)
    .send(rpc('tools/call', { name, arguments: args }));
}

function expectToolFailure(response: any, code = -32000) {
  expect(response.body.result).toBeUndefined();
  expect(response.body.error.code).toBe(code);
  return response.body.error.message as string;
}

const uuidRegex =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/;

function decodedCursorText(cursor: string) {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

const viewConfig = {
  filters: { categoryIds: [], tags: [], temporal: { notUpdatedToday: false } },
  sort: { field: 'updatedAt', direction: 'desc' },
  group: { by: 'none' },
};

let app: express.Express;

beforeAll(async () => {
  await setupTestDatabase();
  app = makeApp();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('MCP endpoint', () => {
  it('requires valid bearer PAT authentication', async () => {
    await request(app).post('/mcp').send(rpc('tools/list')).expect(401);
    const badToken = 'wsc_pat_bad_secret_should_not_leak';
    const badAuth = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${badToken}`)
      .send(rpc('tools/list'))
      .expect(401);
    expect(JSON.stringify(badAuth.body)).not.toContain(badToken);

    const person = await createTestPerson();
    await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);
    await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('tools/list'))
      .expect(200);

    const tokenRecord = await prisma.personalAccessToken.findFirstOrThrow({
      where: { personId: person.id },
    });
    await prisma.personalAccessToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });
    await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('tools/list'))
      .expect(401);

    const expiredToken = await pat(person.id, ['mcp:read']);
    const expiredRecord = await prisma.personalAccessToken.findFirstOrThrow({
      where: { personId: person.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.personalAccessToken.update({
      where: { id: expiredRecord.id },
      data: { expiresAt: new Date('2020-01-01T00:00:00Z') },
    });
    await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send(rpc('tools/list'))
      .expect(401);
  });

  it('lists required tools and does not expose workstreams_delete', async () => {
    const person = await createTestPerson();
    await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);

    const response = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('tools/list'))
      .expect(200);

    const expectedToolNames = [
      'workstreams_list',
      'workstreams_get',
      'workstreams_create',
      'workstreams_update',
      'workstreams_close',
      'workstreams_reopen',
      'updates_list',
      'updates_get',
      'updates_create',
      'updates_update',
      'updates_delete',
      'settings_get',
      'settings_category_create',
      'settings_category_update',
      'settings_category_delete',
      'settings_category_reorder',
      'settings_tag_create',
      'settings_tag_update',
      'settings_tag_delete',
      'settings_views_list',
      'settings_view_get',
      'settings_view_create',
      'settings_view_update',
      'settings_view_delete',
      'timeline_query',
    ];
    const toolNames = response.body.result.tools.map((tool: any) => tool.name);
    expect(toolNames).toEqual(expect.arrayContaining(expectedToolNames));
    expect(new Set(toolNames).size).toBe(toolNames.length);
    expect(toolNames).toHaveLength(expectedToolNames.length);
    expect(toolNames).not.toContain('workstreams_delete');
    expect(toolNames).not.toContain('settings_categories_create');
    expect(toolNames).not.toContain('settings_tags_create');
  });

  it('supports initialize handshake metadata', async () => {
    const person = await createTestPerson();
    await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);

    const response = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(
        rpc(
          'initialize',
          {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'jest', version: '1.0.0' },
          },
          'init-1',
        ),
      )
      .expect(200);

    expect(response.body).toMatchObject({
      jsonrpc: '2.0',
      id: 'init-1',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'workstream-cockpit', version: '1.0.0' },
      },
    });
  });

  it('supports a Codex-like modern MCP startup sequence and exposes tools', async () => {
    const person = await createTestPerson();
    await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);

    const initialize = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream')
      .send(
        rpc(
          'initialize',
          {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'codex', version: 'test' },
          },
          'init-codex',
        ),
      )
      .expect(200);

    expect(initialize.body).toMatchObject({
      jsonrpc: '2.0',
      id: 'init-codex',
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'workstream-cockpit' },
      },
    });

    await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      .expect(202);

    const ping = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('ping', undefined, 'ping-1'))
      .expect(200);
    expect(ping.body).toEqual({ jsonrpc: '2.0', id: 'ping-1', result: {} });

    const tools = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('tools/list'))
      .expect(200);
    expect(tools.body.result.tools.map((tool: any) => tool.name)).toEqual(
      expect.arrayContaining(['workstreams_list', 'updates_create', 'timeline_query']),
    );

    const resources = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('resources/list', undefined, 'resources-1'))
      .expect(200);
    expect(resources.body).toEqual({
      jsonrpc: '2.0',
      id: 'resources-1',
      result: { resources: [] },
    });

    const templates = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('resources/templates/list', undefined, 'templates-1'))
      .expect(200);
    expect(templates.body).toEqual({
      jsonrpc: '2.0',
      id: 'templates-1',
      result: { resourceTemplates: [] },
    });

    const prompts = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send(rpc('prompts/list', undefined, 'prompts-1'))
      .expect(200);
    expect(prompts.body).toEqual({ jsonrpc: '2.0', id: 'prompts-1', result: { prompts: [] } });
  });

  it('returns an explicit method-not-allowed response for unsupported MCP GET streams', async () => {
    await request(app)
      .get('/mcp')
      .set('Accept', 'text/event-stream')
      .expect('Allow', 'POST')
      .expect(405);
  });

  it('enforces read/write scopes and project isolation for tools', async () => {
    const owner = await createTestPerson({ email: 'owner@example.com' });
    const other = await createTestPerson({ email: 'other@example.com' });
    const ownerProject = await createTestProject(owner.id);
    const otherProject = await createTestProject(other.id);
    const ownerWorkstream = await createTestWorkstream(ownerProject.id, { name: 'Owned' });
    const otherWorkstream = await createTestWorkstream(otherProject.id, { name: 'Other' });
    const readOnly = await pat(owner.id, ['mcp:read']);
    const readWrite = await pat(owner.id, ['mcp:read', 'mcp:write']);

    const deniedWrite = await callTool(app, readOnly, 'workstreams_create', {
      name: 'Nope',
    }).expect(200);
    expect(expectToolFailure(deniedWrite, -32001)).toMatch(/mcp:write/);

    const list = await callTool(app, readOnly, 'workstreams_list').expect(200);
    expect(list.body.result.structuredContent.workstreams.map((w: any) => w.id)).toEqual([
      ownerWorkstream.id,
    ]);

    const crossGet = await callTool(app, readWrite, 'workstreams_get', {
      id: otherWorkstream.id,
    }).expect(200);
    expect(expectToolFailure(crossGet)).toMatch(/not found/i);

    const crossUpdate = await callTool(app, readWrite, 'workstreams_update', {
      id: otherWorkstream.id,
      name: 'Hack',
    }).expect(200);
    expect(expectToolFailure(crossUpdate)).toMatch(/not found/i);

    const crossClose = await callTool(app, readWrite, 'workstreams_close', {
      id: otherWorkstream.id,
    }).expect(200);
    expect(expectToolFailure(crossClose)).toBe('Not found');
    expect(await prisma.workstream.findUnique({ where: { id: otherWorkstream.id } })).toMatchObject(
      { state: 'active', closedAt: null },
    );

    const foreignClosedAt = new Date('2024-04-01T00:00:00.000Z');
    await prisma.workstream.update({
      where: { id: otherWorkstream.id },
      data: { state: 'closed', closedAt: foreignClosedAt },
    });
    const crossReopen = await callTool(app, readWrite, 'workstreams_reopen', {
      id: otherWorkstream.id,
    }).expect(200);
    expect(expectToolFailure(crossReopen)).toBe('Not found');
    expect(await prisma.workstream.findUnique({ where: { id: otherWorkstream.id } })).toMatchObject(
      { state: 'closed', closedAt: foreignClosedAt },
    );
  });

  it('supports writes, destructive confirmation, date filters, and timeline filters', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const category = await createTestCategory(project.id, { name: 'Ops' });
    await createTestTag(project.id, { name: 'urgent', displayName: 'Urgent' });
    const token = await pat(person.id, ['mcp:read', 'mcp:write']);

    const created = await callTool(app, token, 'workstreams_create', {
      name: 'Launch',
      categoryId: category.id,
      context: 'Track #urgent',
      initialStatus: 'Started #urgent',
    }).expect(200);
    const workstreamId = created.body.result.structuredContent.workstream.id;

    const oldUpdate = await createTestStatusUpdate(workstreamId, { status: 'Old #urgent' });
    await prisma.statusUpdate.update({
      where: { id: oldUpdate.id },
      data: { createdAt: new Date('2020-01-01T00:00:00Z') },
    });
    const newUpdate = await callTool(app, token, 'updates_create', {
      workstreamId,
      status: 'New #urgent',
    }).expect(200);
    const newUpdateId = newUpdate.body.result.structuredContent.update.id;

    const filtered = await callTool(app, token, 'updates_list', {
      workstreamId,
      startDate: '2021-01-01',
      limit: 50,
    }).expect(200);
    expect(filtered.body.result.structuredContent.updates.map((u: any) => u.id)).toContain(
      newUpdateId,
    );
    expect(filtered.body.result.structuredContent.updates.map((u: any) => u.id)).not.toContain(
      oldUpdate.id,
    );

    const timeline = await callTool(app, token, 'timeline_query', {
      relativeDays: 7,
      tagNames: ['urgent'],
      categoryIds: [category.id],
      eventTypes: ['status_update'],
    }).expect(200);
    expect(
      timeline.body.result.structuredContent.events.every(
        (e: any) => e.eventType === 'status_update',
      ),
    ).toBe(true);
    expect(timeline.body.result.structuredContent.events.map((e: any) => e.workstreamId)).toContain(
      workstreamId,
    );

    const rejectDelete = await callTool(app, token, 'updates_delete', {
      workstreamId,
      id: newUpdateId,
    }).expect(200);
    expect(rejectDelete.body.error.message).toMatch(/confirm/);
    const deleteOk = await callTool(app, token, 'updates_delete', {
      workstreamId,
      id: newUpdateId,
      confirm: true,
    }).expect(200);
    expect(deleteOk.body.result.structuredContent.deletedId).toBe(newUpdateId);
  });

  it('covers workstream get/update and update get/update positive paths plus cross-workstream safety', async () => {
    const owner = await createTestPerson({ email: 'mcp-owner@example.com' });
    const other = await createTestPerson({ email: 'mcp-other@example.com' });
    const ownerProject = await createTestProject(owner.id);
    const otherProject = await createTestProject(other.id);
    const category = await createTestCategory(ownerProject.id, { name: 'Focus' });
    const foreignCategory = await createTestCategory(otherProject.id, { name: 'Foreign Focus' });
    const token = await pat(owner.id, ['mcp:read', 'mcp:write']);

    const workstream = await createTestWorkstream(ownerProject.id, {
      name: 'Original',
      categoryId: category.id,
      context: 'old context',
    });
    const otherOwnerWorkstream = await createTestWorkstream(ownerProject.id, {
      name: 'Other Owner Stream',
    });
    const foreignWorkstream = await createTestWorkstream(otherProject.id, {
      name: 'Foreign Stream',
    });
    const firstUpdate = await createTestStatusUpdate(workstream.id, {
      status: 'First status',
      note: 'first note',
    });
    const secondUpdate = await createTestStatusUpdate(workstream.id, {
      status: 'Second status',
      note: 'second note',
    });
    const otherOwnerUpdate = await createTestStatusUpdate(otherOwnerWorkstream.id, {
      status: 'Sibling status',
      note: 'sibling note',
    });
    const foreignUpdate = await createTestStatusUpdate(foreignWorkstream.id, {
      status: 'Foreign status',
      note: 'foreign note',
    });

    await prisma.statusUpdate.update({
      where: { id: firstUpdate.id },
      data: { createdAt: new Date('2024-03-01T00:00:00.000Z') },
    });
    await prisma.statusUpdate.update({
      where: { id: secondUpdate.id },
      data: { createdAt: new Date('2024-03-02T00:00:00.000Z') },
    });

    const getWithUpdates = await callTool(app, token, 'workstreams_get', {
      id: workstream.id,
      includeUpdates: true,
      updatesLimit: 1,
    }).expect(200);
    expect(getWithUpdates.body.result.structuredContent.workstream).toMatchObject({
      id: workstream.id,
      name: 'Original',
    });
    expect(getWithUpdates.body.result.structuredContent.updates.map((u: any) => u.id)).toEqual([
      secondUpdate.id,
    ]);

    const updatedWorkstream = await callTool(app, token, 'workstreams_update', {
      id: workstream.id,
      name: 'Renamed',
      context: null,
      categoryId: null,
    }).expect(200);
    expect(updatedWorkstream.body.result.structuredContent.workstream).toMatchObject({
      id: workstream.id,
      name: 'Renamed',
      context: null,
      categoryId: null,
    });

    const beforeForeignCategoryCreateCount = await prisma.workstream.count({
      where: { projectId: ownerProject.id },
    });
    const foreignCategoryCreate = await callTool(app, token, 'workstreams_create', {
      name: 'Cross Project Category',
      categoryId: foreignCategory.id,
    }).expect(200);
    expect(expectToolFailure(foreignCategoryCreate)).toBe('Not found');
    expect(await prisma.workstream.count({ where: { projectId: ownerProject.id } })).toBe(
      beforeForeignCategoryCreateCount,
    );

    const foreignCategoryUpdate = await callTool(app, token, 'workstreams_update', {
      id: workstream.id,
      name: 'Should Not Rename',
      categoryId: foreignCategory.id,
    }).expect(200);
    expect(expectToolFailure(foreignCategoryUpdate)).toBe('Not found');
    expect(await prisma.workstream.findUnique({ where: { id: workstream.id } })).toMatchObject({
      name: 'Renamed',
      categoryId: null,
    });

    const gotUpdate = await callTool(app, token, 'updates_get', {
      workstreamId: workstream.id,
      id: secondUpdate.id,
    }).expect(200);
    expect(gotUpdate.body.result.structuredContent.update).toMatchObject({
      id: secondUpdate.id,
      workstreamId: workstream.id,
      status: 'Second status',
    });

    const updatedUpdate = await callTool(app, token, 'updates_update', {
      workstreamId: workstream.id,
      id: secondUpdate.id,
      status: 'Updated status',
      note: null,
    }).expect(200);
    expect(updatedUpdate.body.result.structuredContent.update).toMatchObject({
      id: secondUpdate.id,
      workstreamId: workstream.id,
      status: 'Updated status',
      note: null,
    });

    const wrongWorkstreamGet = await callTool(app, token, 'updates_get', {
      workstreamId: workstream.id,
      id: otherOwnerUpdate.id,
    }).expect(200);
    expect(wrongWorkstreamGet.body.error.message).toMatch(/update not found/i);

    const wrongWorkstreamUpdate = await callTool(app, token, 'updates_update', {
      workstreamId: workstream.id,
      id: otherOwnerUpdate.id,
      status: 'Should not apply',
    }).expect(200);
    expect(wrongWorkstreamUpdate.body.error.message).toBe('Not found');
    expect(
      (await prisma.statusUpdate.findUniqueOrThrow({ where: { id: otherOwnerUpdate.id } })).status,
    ).toBe('Sibling status');

    const wrongWorkstreamDelete = await callTool(app, token, 'updates_delete', {
      workstreamId: workstream.id,
      id: otherOwnerUpdate.id,
      confirm: true,
    }).expect(200);
    expect(wrongWorkstreamDelete.body.error.message).toBe('Not found');
    expect(
      await prisma.statusUpdate.findUnique({ where: { id: otherOwnerUpdate.id } }),
    ).not.toBeNull();

    const foreignUpdateAttempt = await callTool(app, token, 'updates_update', {
      workstreamId: foreignWorkstream.id,
      id: foreignUpdate.id,
      status: 'Stolen',
    }).expect(200);
    expect(expectToolFailure(foreignUpdateAttempt)).toMatch(/workstream not found/i);
    expect(
      (await prisma.statusUpdate.findUniqueOrThrow({ where: { id: foreignUpdate.id } })).status,
    ).toBe('Foreign status');

    const foreignUpdateGet = await callTool(app, token, 'updates_get', {
      workstreamId: foreignWorkstream.id,
      id: foreignUpdate.id,
    }).expect(200);
    expect(expectToolFailure(foreignUpdateGet)).toMatch(/workstream not found/i);

    const foreignUpdateDelete = await callTool(app, token, 'updates_delete', {
      workstreamId: foreignWorkstream.id,
      id: foreignUpdate.id,
      confirm: true,
    }).expect(200);
    expect(expectToolFailure(foreignUpdateDelete)).toMatch(/workstream not found/i);
    expect(
      await prisma.statusUpdate.findUnique({ where: { id: foreignUpdate.id } }),
    ).not.toBeNull();
  });

  it('covers MCP parent stream create/update/list/timeline parity', async () => {
    const person = await createTestPerson({ email: 'mcp-parent-path@example.com' });
    const project = await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read', 'mcp:write']);

    const parentResponse = await callTool(app, token, 'workstreams_create', {
      name: 'MCP Parent',
      initialStatus: 'parent #mcp-parent-path',
    }).expect(200);
    const parent = parentResponse.body.result.structuredContent.workstream;
    const substreamResponse = await callTool(app, token, 'workstreams_create', {
      name: 'MCP Sub-stream',
      parentId: parent.id,
      initialStatus: 'sub-stream #mcp-parent-path',
    }).expect(200);
    const substream = substreamResponse.body.result.structuredContent.workstream;
    expect(substream).toMatchObject({ parentId: parent.id, depth: 2 });
    expect(substream.parent).toMatchObject({ id: parent.id, name: 'MCP Parent' });

    const parentGet = await callTool(app, token, 'workstreams_get', { id: parent.id }).expect(200);
    expect(parentGet.body.result.structuredContent.workstream).toMatchObject({
      id: parent.id,
      substreamCount: 1,
      directSubstreamCount: 1,
    });

    const listed = await callTool(app, token, 'workstreams_list', { state: 'all' }).expect(200);
    expect(listed.body.result.structuredContent.workstreams.map((w: any) => w.id)).toEqual(
      expect.arrayContaining([parent.id, substream.id]),
    );

    const detached = await callTool(app, token, 'workstreams_update', {
      id: substream.id,
      parentId: null,
    }).expect(200);
    expect(detached.body.result.structuredContent.workstream.parentId).toBeNull();
    const reattached = await callTool(app, token, 'workstreams_update', {
      id: substream.id,
      parentId: parent.id,
    }).expect(200);
    expect(reattached.body.result.structuredContent.workstream.parentStreams).toEqual([
      expect.objectContaining({ id: parent.id }),
    ]);

    const directTimeline = await callTool(app, token, 'timeline_query', {
      eventTypes: ['status_update'],
      tagNames: ['mcp-parent-path'],
      streamScope: 'under-parent',
      parentId: parent.id,
    }).expect(200);
    expect(
      directTimeline.body.result.structuredContent.events.map((e: any) => e.workstreamId),
    ).toEqual([parent.id]);

    const treeTimeline = await callTool(app, token, 'timeline_query', {
      eventTypes: ['status_update'],
      tagNames: ['mcp-parent-path'],
      streamScope: 'under-parent',
      parentId: parent.id,
      includeSubstreams: true,
    }).expect(200);
    expect(
      treeTimeline.body.result.structuredContent.events.map((e: any) => e.workstreamId),
    ).toEqual(expect.arrayContaining([parent.id, substream.id]));

    expect(await prisma.workstream.count({ where: { projectId: project.id } })).toBe(2);
  });

  it('groups MCP recursive under-parent lists by the selected filter parent', async () => {
    const person = await createTestPerson({ email: 'mcp-under-parent-grouping@example.com' });
    const project = await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);

    const streamA = await createTestWorkstream(project.id, { name: 'A' });
    const streamB = await createTestWorkstream(project.id, { name: 'B', parentId: streamA.id });
    const streamC = await createTestWorkstream(project.id, { name: 'C', parentId: streamB.id });

    const response = await callTool(app, token, 'workstreams_list', {
      state: 'active',
      hierarchy: 'under-parent',
      parentIds: [streamA.id],
      includeSubstreams: true,
      groupBy: 'parent',
    }).expect(200);

    expect(
      response.body.result.structuredContent.workstreams.map((workstream: any) => workstream.id),
    ).toEqual([streamC.id, streamB.id]);
    expect(response.body.result.structuredContent.groups).toEqual([
      expect.objectContaining({
        key: streamA.id,
        parent: expect.objectContaining({ id: streamA.id, name: 'A' }),
        workstreams: [
          expect.objectContaining({ id: streamC.id, parentId: streamB.id }),
          expect.objectContaining({ id: streamB.id, parentId: streamA.id }),
        ],
      }),
    ]);
  });

  it('returns actionable MCP errors for parent stream rule violations without mutating rows', async () => {
    const person = await createTestPerson({ email: 'mcp-parent-path-negative@example.com' });
    const project = await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read', 'mcp:write']);
    const root = await createTestWorkstream(project.id, { name: 'Root' });
    const substream = await createTestWorkstream(project.id, {
      name: 'Sub-stream',
      parentId: root.id,
    } as any);
    const closedParent = await createTestWorkstream(project.id, {
      name: 'Closed Parent',
      state: 'closed',
    });

    const cycle = await callTool(app, token, 'workstreams_update', {
      id: root.id,
      parentId: substream.id,
    }).expect(200);
    expect(expectToolFailure(cycle)).toMatch(/sub-stream|cycle/i);
    expect(
      (await prisma.workstream.findUniqueOrThrow({ where: { id: root.id } })).parentId,
    ).toBeNull();

    const closed = await callTool(app, token, 'workstreams_update', {
      id: substream.id,
      parentId: closedParent.id,
    }).expect(200);
    expect(expectToolFailure(closed)).toMatch(/closed parent/i);
    expect(
      (await prisma.workstream.findUniqueOrThrow({ where: { id: substream.id } })).parentId,
    ).toBe(root.id);

    const closeRoot = await callTool(app, token, 'workstreams_close', { id: root.id }).expect(200);
    expect(expectToolFailure(closeRoot)).toMatch(/active sub-streams/i);
    expect((await prisma.workstream.findUniqueOrThrow({ where: { id: root.id } })).state).toBe(
      'active',
    );
  });

  it('applies timeline_query safety defaults and validates effective ranges', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);
    const workstream = await createTestWorkstream(project.id, { name: 'Timeline Safety' });

    const oldUpdate = await createTestStatusUpdate(workstream.id, {
      status: 'Old default-window event',
    });
    await prisma.statusUpdate.update({
      where: { id: oldUpdate.id },
      data: { createdAt: new Date(Date.now() - 8 * 86400000) },
    });
    const recentUpdate = await createTestStatusUpdate(workstream.id, {
      status: 'Recent default-window event',
    });

    const defaultWindow = await callTool(app, token, 'timeline_query', {
      eventTypes: ['status_update'],
    }).expect(200);
    const defaultIds = defaultWindow.body.result.structuredContent.events.map(
      (event: any) => event.id,
    );
    expect(defaultIds).toContain(`status-${recentUpdate.id}`);
    expect(defaultIds).not.toContain(`status-${oldUpdate.id}`);

    const explicitRange = await callTool(app, token, 'timeline_query', {
      startDate: new Date(Date.now() - 9 * 86400000).toISOString(),
      endDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      relativeDays: 1,
      eventTypes: ['status_update'],
    }).expect(200);
    const explicitIds = explicitRange.body.result.structuredContent.events.map(
      (event: any) => event.id,
    );
    expect(explicitIds).toContain(`status-${oldUpdate.id}`);
    expect(explicitIds).not.toContain(`status-${recentUpdate.id}`);

    const manyUpdates = [];
    for (let i = 0; i < 55; i += 1) {
      manyUpdates.push(await createTestStatusUpdate(workstream.id, { status: `Recent page ${i}` }));
    }
    const defaultLimit = await callTool(app, token, 'timeline_query', {
      eventTypes: ['status_update'],
    }).expect(200);
    expect(defaultLimit.body.result.structuredContent.events).toHaveLength(50);
    expect(defaultLimit.body.result.structuredContent.nextCursor).toEqual(expect.any(String));
    const returnedIds = defaultLimit.body.result.structuredContent.events.map(
      (event: any) => event.id,
    );
    expect(returnedIds).not.toContain(`status-${oldUpdate.id}`);
    expect(returnedIds).toEqual(
      expect.arrayContaining(manyUpdates.slice(-10).map((update: any) => `status-${update.id}`)),
    );
  });

  it('uses opaque stable cursors for workstreams, updates, and timeline pages', async () => {
    const person = await createTestPerson();
    const project = await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);

    const w1 = await createTestWorkstream(project.id, { name: 'One', context: '#page' });
    const w2 = await createTestWorkstream(project.id, { name: 'Two', context: '#page' });
    const w3 = await createTestWorkstream(project.id, { name: 'Three', context: '#page' });
    await prisma.workstream.update({
      where: { id: w1.id },
      data: { createdAt: new Date('2024-01-01T00:00:00.000Z') },
    });
    await prisma.workstream.update({
      where: { id: w2.id },
      data: { createdAt: new Date('2024-01-02T00:00:00.000Z') },
    });
    await prisma.workstream.update({
      where: { id: w3.id },
      data: { createdAt: new Date('2024-01-03T00:00:00.000Z') },
    });

    const workstreamsPage1 = await callTool(app, token, 'workstreams_list', {
      state: 'all',
      limit: 2,
    }).expect(200);
    expect(
      workstreamsPage1.body.result.structuredContent.workstreams.map((w: any) => w.id),
    ).toEqual([w3.id, w2.id]);
    expect(workstreamsPage1.body.result.structuredContent.nextCursor).toEqual(expect.any(String));
    expect(
      decodedCursorText(workstreamsPage1.body.result.structuredContent.nextCursor),
    ).not.toMatch(uuidRegex);
    expect(
      decodedCursorText(workstreamsPage1.body.result.structuredContent.nextCursor),
    ).not.toContain(w2.id);
    const workstreamsPage2 = await callTool(app, token, 'workstreams_list', {
      state: 'all',
      limit: 2,
      cursor: workstreamsPage1.body.result.structuredContent.nextCursor,
    }).expect(200);
    expect(
      workstreamsPage2.body.result.structuredContent.workstreams.map((w: any) => w.id),
    ).toEqual([w1.id]);
    expect(workstreamsPage2.body.result.structuredContent.nextCursor).toBeNull();

    const u1 = await createTestStatusUpdate(w3.id, { status: 'First #page' });
    const u2 = await createTestStatusUpdate(w3.id, { status: 'Second #page' });
    const u3 = await createTestStatusUpdate(w3.id, { status: 'Third #page' });
    await prisma.statusUpdate.update({
      where: { id: u1.id },
      data: { createdAt: new Date('2024-02-01T00:00:00.000Z') },
    });
    await prisma.statusUpdate.update({
      where: { id: u2.id },
      data: { createdAt: new Date('2024-02-02T00:00:00.000Z') },
    });
    await prisma.statusUpdate.update({
      where: { id: u3.id },
      data: { createdAt: new Date('2024-02-03T00:00:00.000Z') },
    });

    const updatesPage1 = await callTool(app, token, 'updates_list', {
      workstreamId: w3.id,
      limit: 50,
    }).expect(200);
    expect(updatesPage1.body.result.structuredContent.updates.map((u: any) => u.id)).toEqual([
      u3.id,
      u2.id,
      u1.id,
    ]);
    expect(updatesPage1.body.result.structuredContent.nextCursor).toBeNull();

    const moreUpdates = [];
    for (let i = 0; i < 50; i += 1) {
      const update = await createTestStatusUpdate(w3.id, { status: `Bulk #page ${i}` });
      moreUpdates.push(
        await prisma.statusUpdate.update({
          where: { id: update.id },
          data: { createdAt: new Date(`2024-02-04T00:00:${String(i).padStart(2, '0')}.000Z`) },
        }),
      );
    }
    const updatesTooSmall = await callTool(app, token, 'updates_list', {
      workstreamId: w3.id,
      limit: 49,
    }).expect(200);
    expect(expectToolFailure(updatesTooSmall)).toMatch(/limit.*at least 50/i);
    const updatesBulkPage1 = await callTool(app, token, 'updates_list', {
      workstreamId: w3.id,
      limit: 50,
    }).expect(200);
    expect(updatesBulkPage1.body.result.structuredContent.updates).toHaveLength(50);
    expect(updatesBulkPage1.body.result.structuredContent.nextCursor).toEqual(expect.any(String));
    expect(
      decodedCursorText(updatesBulkPage1.body.result.structuredContent.nextCursor),
    ).not.toMatch(uuidRegex);
    expect(
      decodedCursorText(updatesBulkPage1.body.result.structuredContent.nextCursor),
    ).not.toContain(updatesBulkPage1.body.result.structuredContent.updates[49].id);
    const updatesBulkPage2 = await callTool(app, token, 'updates_list', {
      workstreamId: w3.id,
      limit: 50,
      cursor: updatesBulkPage1.body.result.structuredContent.nextCursor,
    }).expect(200);
    expect(updatesBulkPage2.body.result.structuredContent.updates.map((u: any) => u.id)).toEqual([
      u3.id,
      u2.id,
      u1.id,
    ]);

    const timelinePage1 = await callTool(app, token, 'timeline_query', {
      startDate: '2024-02-01',
      endDate: '2024-02-03T23:59:59Z',
      eventTypes: ['status_update'],
      tagNames: ['page'],
      limit: 2,
    }).expect(200);
    expect(timelinePage1.body.result.structuredContent.events.map((e: any) => e.id)).toEqual([
      `status-${u3.id}`,
      `status-${u2.id}`,
    ]);
    expect(timelinePage1.body.result.structuredContent.nextCursor).toEqual(expect.any(String));
    expect(decodedCursorText(timelinePage1.body.result.structuredContent.nextCursor)).not.toMatch(
      uuidRegex,
    );
    expect(decodedCursorText(timelinePage1.body.result.structuredContent.nextCursor)).not.toContain(
      u2.id,
    );
    const timelinePage2 = await callTool(app, token, 'timeline_query', {
      startDate: '2024-02-01',
      endDate: '2024-02-03T23:59:59Z',
      eventTypes: ['status_update'],
      tagNames: ['page'],
      limit: 2,
      cursor: timelinePage1.body.result.structuredContent.nextCursor,
    }).expect(200);
    expect(timelinePage2.body.result.structuredContent.events.map((e: any) => e.id)).toEqual([
      `status-${u1.id}`,
    ]);
  });

  it('paginates updates_list includeSubstreams with stable same-timestamp mixed history', async () => {
    const person = await createTestPerson({ email: 'mcp-updates-substream-page@example.com' });
    const project = await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);
    const parent = await createTestWorkstream(project.id, { name: 'Parent history' });
    const child = await createTestWorkstream(project.id, {
      name: 'Child history',
      parentId: parent.id,
    } as any);
    const timestamp = new Date('2024-05-01T12:00:00.000Z');
    const updates = [];
    for (let i = 0; i < 52; i += 1) {
      const update = await createTestStatusUpdate(i % 2 === 0 ? parent.id : child.id, {
        status: `Mixed ${i}`,
      });
      updates.push(
        await prisma.statusUpdate.update({
          where: { id: update.id },
          data: { createdAt: timestamp },
        }),
      );
    }
    const expectedIds = updates
      .map((update: any) => update.id)
      .sort((a: string, b: string) => b.localeCompare(a));

    const page1 = await callTool(app, token, 'updates_list', {
      workstreamId: parent.id,
      includeSubstreams: true,
      limit: 50,
    }).expect(200);
    expect(page1.body.result.structuredContent.updates.map((u: any) => u.id)).toEqual(
      expectedIds.slice(0, 50),
    );
    expect(page1.body.result.structuredContent.nextCursor).toEqual(expect.any(String));
    expect(decodedCursorText(page1.body.result.structuredContent.nextCursor)).not.toMatch(
      uuidRegex,
    );
    expect(decodedCursorText(page1.body.result.structuredContent.nextCursor)).not.toContain(
      expectedIds[49],
    );

    const page2 = await callTool(app, token, 'updates_list', {
      workstreamId: parent.id,
      includeSubstreams: true,
      limit: 50,
      cursor: page1.body.result.structuredContent.nextCursor,
    }).expect(200);
    expect(page2.body.result.structuredContent.updates.map((u: any) => u.id)).toEqual(
      expectedIds.slice(50),
    );
    expect(page2.body.result.structuredContent.nextCursor).toBeNull();
  });

  it('covers settings category, tag, and view CRUD effects plus project isolation', async () => {
    const owner = await createTestPerson({ email: 'settings-owner@example.com' });
    const other = await createTestPerson({ email: 'settings-other@example.com' });
    const ownerProject = await createTestProject(owner.id, { name: 'Owner Settings Project' });
    const otherProject = await createTestProject(other.id, { name: 'Other Settings Project' });
    const token = await pat(owner.id, ['mcp:read', 'mcp:write']);

    const otherCategory = await createTestCategory(otherProject.id, { name: 'Other Category' });
    const otherTag = await createTestTag(otherProject.id, { displayName: 'Other Tag' });
    const otherView = await prisma.view.create({
      data: {
        projectId: otherProject.id,
        name: 'Other View',
        config: viewConfig,
      },
    });

    const createdCategory = await callTool(app, token, 'settings_category_create', {
      name: 'MCP Ops',
      color: '#abc123',
      emoji: '🧪',
    }).expect(200);
    const categoryId = createdCategory.body.result.structuredContent.category.id;
    expect(createdCategory.body.result.structuredContent.category.color).toBe('#ABC123');
    const updatedCategory = await callTool(app, token, 'settings_category_update', {
      id: categoryId,
      name: 'MCP Platform',
      color: '#123abc',
      emoji: null,
    }).expect(200);
    expect(updatedCategory.body.result.structuredContent.category).toMatchObject({
      id: categoryId,
      name: 'MCP Platform',
      color: '#123ABC',
      emoji: null,
    });
    const categorizedWorkstream = await createTestWorkstream(ownerProject.id, {
      name: 'Uses MCP Ops',
      categoryId,
    });

    const crossCategoryUpdate = await callTool(app, token, 'settings_category_update', {
      id: otherCategory.id,
      name: 'Stolen',
    }).expect(200);
    expect(crossCategoryUpdate.body.error.message).toBe('Not found');
    const crossCategoryDelete = await callTool(app, token, 'settings_category_delete', {
      id: otherCategory.id,
      confirm: true,
    }).expect(200);
    expect(crossCategoryDelete.body.error.message).toBe('Not found');
    expect(await prisma.category.findUnique({ where: { id: otherCategory.id } })).not.toBeNull();

    const categoryDeleteRejected = await callTool(app, token, 'settings_category_delete', {
      id: categoryId,
      confirm: false,
    }).expect(200);
    expect(categoryDeleteRejected.body.error.message).toMatch(/confirm/);
    expect(await prisma.category.findUnique({ where: { id: categoryId } })).not.toBeNull();
    const categoryDeleteOk = await callTool(app, token, 'settings_category_delete', {
      id: categoryId,
      confirm: true,
    }).expect(200);
    expect(categoryDeleteOk.body.result.structuredContent.deletedId).toBe(categoryId);
    expect(await prisma.category.findUnique({ where: { id: categoryId } })).toBeNull();
    expect(
      (await prisma.workstream.findUniqueOrThrow({ where: { id: categorizedWorkstream.id } }))
        .categoryId,
    ).toBeNull();

    const createdTag = await callTool(app, token, 'settings_tag_create', {
      displayName: 'Needs Review',
      color: '#00aa11',
    }).expect(200);
    const tagId = createdTag.body.result.structuredContent.tag.id;
    expect(createdTag.body.result.structuredContent.tag.name).toBe('needs_review');
    expect(createdTag.body.result.structuredContent.tag.color).toBe('#00AA11');

    const crossTagUpdate = await callTool(app, token, 'settings_tag_update', {
      id: otherTag.id,
      displayName: 'Hijacked',
    }).expect(200);
    expect(crossTagUpdate.body.error.message).toBe('Not found');
    const crossTagDelete = await callTool(app, token, 'settings_tag_delete', {
      id: otherTag.id,
      confirm: true,
    }).expect(200);
    expect(crossTagDelete.body.error.message).toBe('Not found');
    expect(await prisma.tag.findUnique({ where: { id: otherTag.id } })).not.toBeNull();

    const updatedTag = await callTool(app, token, 'settings_tag_update', {
      id: tagId,
      displayName: 'Reviewed Done',
      color: '#123456',
    }).expect(200);
    expect(updatedTag.body.result.structuredContent.tag).toMatchObject({
      id: tagId,
      displayName: 'Reviewed Done',
      name: 'reviewed_done',
      color: '#123456',
    });
    const tagDeleteRejected = await callTool(app, token, 'settings_tag_delete', {
      id: tagId,
      confirm: false,
    }).expect(200);
    expect(tagDeleteRejected.body.error.message).toMatch(/confirm/);
    const tagDeleteOk = await callTool(app, token, 'settings_tag_delete', {
      id: tagId,
      confirm: true,
    }).expect(200);
    expect(tagDeleteOk.body.result.structuredContent.deletedId).toBe(tagId);
    expect(await prisma.tag.findUnique({ where: { id: tagId } })).toBeNull();

    const baseConfig = {
      ...viewConfig,
      filters: { ...viewConfig.filters, tags: ['reviewed_done'] },
    };
    const defaultView = await callTool(app, token, 'settings_view_create', {
      name: 'Default MCP View',
      isDefault: true,
      config: baseConfig,
    }).expect(200);
    const defaultViewId = defaultView.body.result.structuredContent.view.id;
    expect(defaultView.body.result.structuredContent.view.isDefault).toBe(true);

    const defaultDeleteRejected = await callTool(app, token, 'settings_view_delete', {
      id: defaultViewId,
      confirm: true,
    }).expect(200);
    expect(defaultDeleteRejected.body.error.message).toBe('Tool failed');
    expect((await prisma.view.findUniqueOrThrow({ where: { id: defaultViewId } })).isDefault).toBe(
      true,
    );

    const createdView = await callTool(app, token, 'settings_view_create', {
      name: 'Review View',
      config: baseConfig,
    }).expect(200);
    const viewId = createdView.body.result.structuredContent.view.id;
    expect(createdView.body.result.structuredContent.view.isDefault).toBe(false);

    const crossViewGet = await callTool(app, token, 'settings_view_get', {
      id: otherView.id,
    }).expect(200);
    expect(crossViewGet.body.error.message).toBe('Not found');
    const crossViewUpdate = await callTool(app, token, 'settings_view_update', {
      id: otherView.id,
      name: 'Stolen View',
    }).expect(200);
    expect(crossViewUpdate.body.error.message).toBe('Not found');
    const crossViewDelete = await callTool(app, token, 'settings_view_delete', {
      id: otherView.id,
      confirm: true,
    }).expect(200);
    expect(crossViewDelete.body.error.message).toBe('Not found');
    expect(await prisma.view.findUnique({ where: { id: otherView.id } })).not.toBeNull();

    const gotView = await callTool(app, token, 'settings_view_get', { id: viewId }).expect(200);
    expect(gotView.body.result.structuredContent.view.name).toBe('Review View');
    const updatedConfig = {
      ...baseConfig,
      filters: { ...baseConfig.filters, temporal: { notUpdatedToday: true } },
    };
    const updatedView = await callTool(app, token, 'settings_view_update', {
      id: viewId,
      name: 'Updated Review View',
      config: updatedConfig,
    }).expect(200);
    expect(updatedView.body.result.structuredContent.view.name).toBe('Updated Review View');
    expect(
      updatedView.body.result.structuredContent.view.config.filters.temporal.notUpdatedToday,
    ).toBe(true);

    const viewList = await callTool(app, token, 'settings_views_list').expect(200);
    expect(viewList.body.result.structuredContent.views.map((view: any) => view.id)).toEqual(
      expect.arrayContaining([defaultViewId, viewId]),
    );
    expect(viewList.body.result.structuredContent.views.map((view: any) => view.id)).not.toContain(
      otherView.id,
    );

    const viewDeleteRejected = await callTool(app, token, 'settings_view_delete', {
      id: viewId,
      confirm: false,
    }).expect(200);
    expect(viewDeleteRejected.body.error.message).toMatch(/confirm/);
    const viewDeleteOk = await callTool(app, token, 'settings_view_delete', {
      id: viewId,
      confirm: true,
    }).expect(200);
    expect(viewDeleteOk.body.result.structuredContent.deletedId).toBe(viewId);
    expect(await prisma.view.findUnique({ where: { id: viewId } })).toBeNull();

    const settings = await callTool(app, token, 'settings_get').expect(200);
    expect(
      settings.body.result.structuredContent.categories.map((category: any) => category.id),
    ).not.toContain(categoryId);
    expect(settings.body.result.structuredContent.tags.map((tag: any) => tag.id)).not.toContain(
      tagId,
    );
    expect(settings.body.result.structuredContent.views.map((view: any) => view.id)).toEqual([
      defaultViewId,
    ]);
  });

  it('handles JSON-RPC notifications and batches without responding to notifications', async () => {
    const person = await createTestPerson();
    await createTestProject(person.id);
    const token = await pat(person.id, ['mcp:read']);

    await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      .expect(202);

    const batch = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .send([
        rpc('tools/list', undefined, 'list-1'),
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        rpc('missing/method', undefined, 'missing-1'),
      ])
      .expect(200);

    expect(batch.body).toHaveLength(2);
    expect(batch.body.map((r: any) => r.id)).toEqual(['list-1', 'missing-1']);
    expect(batch.body[0].result.tools.length).toBeGreaterThan(0);
    expect(batch.body[1].error.code).toBe(-32601);
  });

  it('supports settings include, close/reopen, validation, sanitized errors, and rate limiting', async () => {
    const person = await createTestPerson();
    const other = await createTestPerson({ email: 'settings-reorder-other@example.com' });
    const project = await createTestProject(person.id);
    const otherProject = await createTestProject(other.id);
    const categoryA = await createTestCategory(project.id, { name: 'A', sortOrder: 0 });
    const categoryB = await createTestCategory(project.id, { name: 'B', sortOrder: 1 });
    const foreignCategory = await createTestCategory(otherProject.id, {
      name: 'Foreign Reorder',
      sortOrder: 7,
    });
    const workstream = await createTestWorkstream(project.id, { name: 'Closable' });
    const token = await pat(person.id, ['mcp:read', 'mcp:write']);

    const settings = await callTool(app, token, 'settings_get', { include: ['categories'] }).expect(
      200,
    );
    expect(settings.body.result.structuredContent.categories.map((c: any) => c.id)).toEqual([
      categoryA.id,
      categoryB.id,
    ]);
    expect(settings.body.result.structuredContent.tags).toBeUndefined();
    expect(settings.body.result.structuredContent.views).toBeUndefined();

    const close = await callTool(app, token, 'workstreams_close', { id: workstream.id }).expect(
      200,
    );
    expect(close.body.result.structuredContent.workstream.state).toBe('closed');
    const reopen = await callTool(app, token, 'workstreams_reopen', { id: workstream.id }).expect(
      200,
    );
    expect(reopen.body.result.structuredContent.workstream.state).toBe('active');

    const reordered = await callTool(app, token, 'settings_category_reorder', {
      categoryIds: [categoryB.id, categoryA.id],
    }).expect(200);
    expect(reordered.body.result.structuredContent.categories.map((c: any) => c.id)).toEqual([
      categoryB.id,
      categoryA.id,
    ]);

    const mixedReorder = await callTool(app, token, 'settings_category_reorder', {
      categoryIds: [categoryA.id, foreignCategory.id],
    }).expect(200);
    expect(expectToolFailure(mixedReorder)).toBe('Not found');
    expect(await prisma.category.findUnique({ where: { id: categoryA.id } })).toMatchObject({
      sortOrder: 1,
    });
    expect(await prisma.category.findUnique({ where: { id: categoryB.id } })).toMatchObject({
      sortOrder: 0,
    });
    expect(await prisma.category.findUnique({ where: { id: foreignCategory.id } })).toMatchObject({
      sortOrder: 7,
    });

    const tag = await callTool(app, token, 'settings_tag_create', {
      displayName: 'MCP',
      color: '#abcdef',
    }).expect(200);
    expect(tag.body.result.structuredContent.tag.color).toBe('#ABCDEF');

    const badLimit = await callTool(app, token, 'workstreams_list', { limit: 'NaN' }).expect(200);
    expect(badLimit.body.error.message).toMatch(/limit.*integer/i);
    expect(badLimit.body.error.message).not.toMatch(/prisma|nan/i);

    const badRelativeDays = await callTool(app, token, 'timeline_query', {
      relativeDays: 0,
    }).expect(200);
    expect(badRelativeDays.body.error.message).toMatch(/relativeDays.*at least 1/i);

    const reversedTimelineRange = await callTool(app, token, 'timeline_query', {
      startDate: '2024-02-02',
      endDate: '2024-02-01',
    }).expect(200);
    expect(reversedTimelineRange.body.error.message).toMatch(
      /startDate.*before or equal to endDate/i,
    );

    const tooWideTimelineRange = await callTool(app, token, 'timeline_query', {
      startDate: '2024-01-01',
      endDate: '2025-01-02',
    }).expect(200);
    expect(tooWideTimelineRange.body.error.message).toMatch(/date range.*366 days or fewer/i);

    const badDate = await callTool(app, token, 'updates_list', {
      workstreamId: workstream.id,
      startDate: '2024-02-31',
    }).expect(200);
    expect(badDate.body.error.message).toMatch(/startDate.*valid ISO date/i);

    const tooManyTags = await callTool(app, token, 'timeline_query', {
      tagNames: Array.from({ length: 51 }, (_, i) => `tag${i}`),
    }).expect(200);
    expect(tooManyTags.body.error.message).toMatch(/tagNames.*50 items or fewer/i);

    const extraArg = await callTool(app, token, 'workstreams_get', {
      id: workstream.id,
      unexpected: true,
    }).expect(200);
    expect(extraArg.body.error.message).toMatch(/unexpected.*not allowed/i);

    const sanitized = await callTool(app, token, 'settings_category_update', {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Nope',
    }).expect(200);
    expect(sanitized.body.error.message).toBe('Not found');

    const oldRateLimit = process.env.MCP_RATE_LIMIT_PER_MINUTE;
    process.env.MCP_RATE_LIMIT_PER_MINUTE = '2';
    const ratePerson = await createTestPerson({ email: 'rate@example.com' });
    await createTestProject(ratePerson.id);
    const rateToken = await pat(ratePerson.id, ['mcp:read']);
    try {
      await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${rateToken}`)
        .send(rpc('tools/list'))
        .expect(200);
      await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${rateToken}`)
        .send(rpc('tools/list'))
        .expect(200);
      await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${rateToken}`)
        .send(rpc('tools/list'))
        .expect(429);
    } finally {
      if (oldRateLimit === undefined) delete process.env.MCP_RATE_LIMIT_PER_MINUTE;
      else process.env.MCP_RATE_LIMIT_PER_MINUTE = oldRateLimit;
    }

    const oldAuthFailureLimit = process.env.MCP_AUTH_FAILURE_RATE_LIMIT_PER_MINUTE;
    process.env.MCP_AUTH_FAILURE_RATE_LIMIT_PER_MINUTE = '3';
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const response = await request(app)
          .post('/mcp')
          .set('Authorization', `Bearer wsc_pat_bad_${i}`)
          .send(rpc('tools/list'));
        statuses.push(response.status);
        if (response.status === 429) break;
      }
      expect(statuses).toContain(429);
    } finally {
      if (oldAuthFailureLimit === undefined)
        delete process.env.MCP_AUTH_FAILURE_RATE_LIMIT_PER_MINUTE;
      else process.env.MCP_AUTH_FAILURE_RATE_LIMIT_PER_MINUTE = oldAuthFailureLimit;
    }
  });
});
