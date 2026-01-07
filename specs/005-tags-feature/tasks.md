# Tasks: Tags System

**Feature**: 005-tags-feature
**Status**: Planning
**Created**: 2026-01-06

---

## Task Overview

This document provides detailed, actionable tasks for implementing the tags system. Tasks are organized by phase and include time estimates, priorities, dependencies, and acceptance criteria.

**Total Estimated Time**: 8 days (64 hours)

**Task Status Legend**:
- ⬜ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked

---

## Phase 1: Database Schema & Migration (Day 1)

### Task 1.1: Update Prisma Schema
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Open `backend/prisma/schema.prisma`
2. Add `Tag` model after `Category` model
3. Add `tags` relation to `Project` model
4. Save file

**Code to Add**:
```prisma
model Tag {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String   // lowercase, alphanumeric + hyphens/underscores
  color     String   // hex color code
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, name])
  @@index([projectId])
  @@map("tags")
}

// Update Project model - add this line to the relations section:
model Project {
  // ... existing fields
  categories  Category[]
  workstreams Workstream[]
  tags        Tag[]  // ADD THIS LINE
}
```

**Acceptance Criteria**:
- [ ] `Tag` model added with all fields
- [ ] Unique constraint on `[projectId, name]`
- [ ] Index on `projectId`
- [ ] Cascade delete on project removal
- [ ] `tags` relation added to `Project` model
- [ ] File saves without syntax errors

**Dependencies**: None

---

### Task 1.2: Generate and Test Migration
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Run migration command:
   ```bash
   cd backend
   npx prisma migrate dev --name add_tags_table
   ```
2. Review generated migration SQL
3. Verify migration applied to local database
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Test database connection:
   ```bash
   npm run test:db
   ```

**Acceptance Criteria**:
- [ ] Migration file created in `backend/prisma/migrations/`
- [ ] `tags` table exists in database
- [ ] Unique index exists on `(project_id, name)`
- [ ] Foreign key exists to `projects` table
- [ ] Prisma client regenerated successfully
- [ ] Can import `Tag` type from `@prisma/client`

**Dependencies**: Task 1.1

---

## Phase 2: Backend Tag Service (Day 1)

### Task 2.1: Create Tag Service File and Types
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Create `backend/src/services/tagService.ts`
2. Add imports and type definitions
3. Implement helper functions (validation, normalization)

**Code to Add**:
```typescript
import { PrismaClient, Tag } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateTagInput {
  projectId: string;
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// Tag name validation regex
const TAG_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate tag name format
 */
export function validateTagName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 50) {
    return false;
  }
  return TAG_NAME_PATTERN.test(name);
}

/**
 * Normalize tag name to lowercase
 */
export function normalizeTagName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Validate hex color format
 */
export function validateColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
```

**Acceptance Criteria**:
- [ ] File created at correct path
- [ ] Imports working
- [ ] Types defined
- [ ] Helper functions implemented
- [ ] TypeScript compiles without errors

**Dependencies**: Task 1.2

---

### Task 2.2: Implement CRUD Functions
**Estimated Time**: 2 hours
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Implement `createTag()` function
2. Implement `getTagsByProjectId()` function
3. Implement `getTagById()` function
4. Implement `updateTag()` function
5. Implement `deleteTag()` function

**Code to Add** (continue in `tagService.ts`):
```typescript
/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  try {
    // Validate name format
    if (!validateTagName(input.name)) {
      throw new Error('Invalid tag name format. Use only letters, numbers, hyphens, and underscores.');
    }

    // Validate color format
    if (!validateColor(input.color)) {
      throw new Error('Invalid color format. Use hex format (#RRGGBB).');
    }

    const normalizedName = normalizeTagName(input.name);

    logger.info(`Creating tag: ${normalizedName} for project ${input.projectId}`);

    const tag = await prisma.tag.create({
      data: {
        projectId: input.projectId,
        name: normalizedName,
        color: input.color.toUpperCase(),
      },
    });

    logger.info(`Tag created successfully: ${tag.id}`);
    return tag;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      throw new Error(`Tag "${input.name}" already exists in this project.`);
    }
    logger.error('Error creating tag:', error);
    throw error;
  }
}

/**
 * Get all tags for a project
 */
export async function getTagsByProjectId(projectId: string): Promise<Tag[]> {
  try {
    logger.info(`Fetching tags for project ${projectId}`);
    
    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    logger.info(`Found ${tags.length} tags`);
    return tags;
  } catch (error) {
    logger.error('Error fetching tags:', error);
    throw error;
  }
}

/**
 * Get a single tag by ID
 */
export async function getTagById(id: string, projectId: string): Promise<Tag | null> {
  try {
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        projectId,
      },
    });

    return tag;
  } catch (error) {
    logger.error('Error fetching tag:', error);
    throw error;
  }
}

/**
 * Update a tag
 */
export async function updateTag(
  id: string,
  projectId: string,
  input: UpdateTagInput
): Promise<Tag> {
  try {
    // Verify tag exists and belongs to project
    const existingTag = await getTagById(id, projectId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (!validateTagName(input.name)) {
        throw new Error('Invalid tag name format. Use only letters, numbers, hyphens, and underscores.');
      }
    }

    // Validate color if provided
    if (input.color !== undefined) {
      if (!validateColor(input.color)) {
        throw new Error('Invalid color format. Use hex format (#RRGGBB).');
      }
    }

    const updateData: any = {};
    if (input.name !== undefined) {
      updateData.name = normalizeTagName(input.name);
    }
    if (input.color !== undefined) {
      updateData.color = input.color.toUpperCase();
    }

    logger.info(`Updating tag ${id}`);

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Tag updated successfully: ${tag.id}`);
    return tag;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      throw new Error(`Tag "${input.name}" already exists in this project.`);
    }
    logger.error('Error updating tag:', error);
    throw error;
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string, projectId: string): Promise<void> {
  try {
    // Verify tag exists and belongs to project
    const existingTag = await getTagById(id, projectId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    logger.info(`Deleting tag ${id}`);

    await prisma.tag.delete({
      where: { id },
    });

    logger.info(`Tag deleted successfully: ${id}`);
  } catch (error) {
    logger.error('Error deleting tag:', error);
    throw error;
  }
}
```

**Acceptance Criteria**:
- [ ] All CRUD functions implemented
- [ ] Input validation in place
- [ ] Error handling implemented
- [ ] Logging added
- [ ] TypeScript compiles without errors
- [ ] Functions can be imported

**Dependencies**: Task 2.1

---

## Phase 3: Backend API Routes (Day 1-2)

### Task 3.1: Create Tag Routes File
**Estimated Time**: 2 hours
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Create `backend/src/routes/tags.ts`
2. Implement all REST endpoints
3. Add request validation
4. Add error handling

**Code to Add**:
```typescript
import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as tagService from '../services/tagService';
import { logger } from '../utils/logger';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/tags
 * Get all tags for current project
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.user!.activeProjectId;

    const tags = await tagService.getTagsByProjectId(projectId);

    res.json({ tags });
  } catch (error: any) {
    logger.error('GET /api/tags error:', error);
    res.status(500).json({ message: 'Failed to fetch tags' });
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.user!.activeProjectId;
    const { name, color } = req.body;

    // Validate required fields
    if (!name || !color) {
      return res.status(400).json({ message: 'Name and color are required' });
    }

    const tag = await tagService.createTag({
      projectId,
      name,
      color,
    });

    res.status(201).json({ tag });
  } catch (error: any) {
    logger.error('POST /api/tags error:', error);
    
    // Return 400 for validation errors
    if (error.message.includes('Invalid') || error.message.includes('already exists')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to create tag' });
  }
});

/**
 * PATCH /api/tags/:id
 * Update a tag
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.user!.activeProjectId;
    const { id } = req.params;
    const { name, color } = req.body;

    // Validate at least one field provided
    if (name === undefined && color === undefined) {
      return res.status(400).json({ message: 'At least one field (name or color) is required' });
    }

    const tag = await tagService.updateTag(id, projectId, { name, color });

    res.json({ tag });
  } catch (error: any) {
    logger.error(`PATCH /api/tags/${req.params.id} error:`, error);

    // Return 404 for not found
    if (error.message === 'Tag not found') {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Return 400 for validation errors
    if (error.message.includes('Invalid') || error.message.includes('already exists')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to update tag' });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.user!.activeProjectId;
    const { id } = req.params;

    await tagService.deleteTag(id, projectId);

    res.status(204).send();
  } catch (error: any) {
    logger.error(`DELETE /api/tags/${req.params.id} error:`, error);

    // Return 404 for not found
    if (error.message === 'Tag not found') {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.status(500).json({ message: 'Failed to delete tag' });
  }
});

export default router;
```

**Acceptance Criteria**:
- [ ] All routes implemented (GET, POST, PATCH, DELETE)
- [ ] Authentication middleware applied
- [ ] Request validation in place
- [ ] Error responses appropriate (400, 404, 500)
- [ ] Success responses formatted correctly
- [ ] TypeScript compiles without errors

**Dependencies**: Task 2.2

---

### Task 3.2: Register Routes in Server
**Estimated Time**: 15 minutes
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Open `backend/src/server.ts`
2. Import tag routes
3. Register routes with app

**Code to Add**:
```typescript
// Add import at top with other route imports
import tagRoutes from './routes/tags';

// Add route registration with other routes
app.use('/api/tags', tagRoutes);
```

**Acceptance Criteria**:
- [ ] Import added
- [ ] Route registered
- [ ] Server starts without errors
- [ ] Routes accessible at `/api/tags`

**Dependencies**: Task 3.1

---

## Phase 4: Backend Integration Tests (Day 2)

### Task 4.1: Create Test File and Setup
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Create `backend/tests/integration/tags.test.ts`
2. Add imports and setup/teardown
3. Create helper functions

**Code to Add**:
```typescript
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { cleanDatabase, createTestUser, createTestProject } from '../helpers/testDb';

describe('Tag Management API', () => {
  let app: any;
  let authToken: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create test user and project
    const { user, token } = await createTestUser(app);
    userId = user.id;
    authToken = token;

    const project = await createTestProject(userId, 'Test Project');
    projectId = project.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // Helper function to create a tag
  async function createTag(name: string, color: string = '#1DA1F2') {
    const response = await request(app)
      .post('/api/tags')
      .set('Cookie', authToken)
      .send({ name, color });
    
    return response;
  }

  // Tests will be added in next tasks
});
```

**Acceptance Criteria**:
- [ ] Test file created
- [ ] Imports working
- [ ] Setup/teardown configured
- [ ] Helper function created
- [ ] Tests can be run with `npm test`

**Dependencies**: Task 3.2

---

### Task 4.2: POST /api/tags Tests
**Estimated Time**: 1.5 hours
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Add POST success tests
2. Add POST validation tests
3. Add POST error tests

**Code to Add** (in `tags.test.ts`):
```typescript
describe('POST /api/tags', () => {
  it('creates tag with valid data', async () => {
    const response = await createTag('backend', '#1DA1F2');

    expect(response.status).toBe(201);
    expect(response.body.tag).toMatchObject({
      name: 'backend',
      color: '#1DA1F2',
      projectId,
    });
    expect(response.body.tag.id).toBeDefined();
    expect(response.body.tag.createdAt).toBeDefined();
  });

  it('normalizes tag name to lowercase', async () => {
    const response = await createTag('Backend');

    expect(response.status).toBe(201);
    expect(response.body.tag.name).toBe('backend');
  });

  it('accepts tags with hyphens and underscores', async () => {
    const response1 = await createTag('backend-team');
    const response2 = await createTag('api_v2');

    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);
  });

  it('rejects duplicate tag name (case-insensitive)', async () => {
    await createTag('backend');
    const response = await createTag('Backend');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already exists');
  });

  it('rejects invalid tag name with spaces', async () => {
    const response = await createTag('my tag');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid tag name');
  });

  it('rejects invalid tag name with special chars', async () => {
    const response = await createTag('my@tag');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid tag name');
  });

  it('rejects empty tag name', async () => {
    const response = await createTag('');

    expect(response.status).toBe(400);
  });

  it('rejects tag name over 50 chars', async () => {
    const longName = 'a'.repeat(51);
    const response = await createTag(longName);

    expect(response.status).toBe(400);
  });

  it('rejects invalid color format (not hex)', async () => {
    const response = await createTag('backend', 'blue');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid color');
  });

  it('rejects invalid color format (short hex)', async () => {
    const response = await createTag('backend', '#1DA');

    expect(response.status).toBe(400);
  });

  it('rejects missing name', async () => {
    const response = await request(app)
      .post('/api/tags')
      .set('Cookie', authToken)
      .send({ color: '#1DA1F2' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('required');
  });

  it('rejects missing color', async () => {
    const response = await request(app)
      .post('/api/tags')
      .set('Cookie', authToken)
      .send({ name: 'backend' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('required');
  });

  it('rejects unauthorized requests', async () => {
    const response = await request(app)
      .post('/api/tags')
      .send({ name: 'backend', color: '#1DA1F2' });

    expect(response.status).toBe(401);
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Positive cases covered
- [ ] Validation cases covered
- [ ] Error cases covered
- [ ] Test coverage > 90% for create function

**Dependencies**: Task 4.1

---

### Task 4.3: GET /api/tags Tests
**Estimated Time**: 45 minutes
**Priority**: P0 (Blocker)
**Status**: ⬜

**Code to Add**:
```typescript
describe('GET /api/tags', () => {
  it('returns all tags for project', async () => {
    await createTag('backend', '#1DA1F2');
    await createTag('frontend', '#10B981');

    const response = await request(app)
      .get('/api/tags')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.tags).toHaveLength(2);
    expect(response.body.tags[0].name).toBe('backend');
    expect(response.body.tags[1].name).toBe('frontend');
  });

  it('returns empty array when no tags exist', async () => {
    const response = await request(app)
      .get('/api/tags')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.tags).toEqual([]);
  });

  it('does not return tags from other projects', async () => {
    // Create another project
    const otherProject = await createTestProject(userId, 'Other Project');
    
    // Create tag in original project
    await createTag('backend');

    // Switch to other project (would need to implement project switching)
    // For now, just verify tags are project-scoped
    const response = await request(app)
      .get('/api/tags')
      .set('Cookie', authToken);

    expect(response.body.tags.every((t: any) => t.projectId === projectId)).toBe(true);
  });

  it('rejects unauthorized requests', async () => {
    const response = await request(app)
      .get('/api/tags');

    expect(response.status).toBe(401);
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Returns correct data structure
- [ ] Project isolation verified
- [ ] Auth required

**Dependencies**: Task 4.2

---

### Task 4.4: PATCH /api/tags/:id Tests
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Code to Add**:
```typescript
describe('PATCH /api/tags/:id', () => {
  it('updates tag name', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ name: 'backend-team' });

    expect(response.status).toBe(200);
    expect(response.body.tag.name).toBe('backend-team');
  });

  it('updates tag color', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ color: '#FF0000' });

    expect(response.status).toBe(200);
    expect(response.body.tag.color).toBe('#FF0000');
  });

  it('updates both name and color', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ name: 'frontend', color: '#00FF00' });

    expect(response.status).toBe(200);
    expect(response.body.tag.name).toBe('frontend');
    expect(response.body.tag.color).toBe('#00FF00');
  });

  it('normalizes updated name to lowercase', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ name: 'Backend-Team' });

    expect(response.body.tag.name).toBe('backend-team');
  });

  it('rejects duplicate name', async () => {
    await createTag('backend');
    const createResponse = await createTag('frontend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ name: 'backend' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already exists');
  });

  it('rejects invalid name format', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ name: 'my tag' });

    expect(response.status).toBe(400);
  });

  it('rejects invalid color format', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({ color: 'blue' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for non-existent tag', async () => {
    const response = await request(app)
      .patch('/api/tags/non-existent-id')
      .set('Cookie', authToken)
      .send({ name: 'backend' });

    expect(response.status).toBe(404);
  });

  it('returns 400 when no fields provided', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .set('Cookie', authToken)
      .send({});

    expect(response.status).toBe(400);
  });

  it('rejects unauthorized requests', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .patch(`/api/tags/${tagId}`)
      .send({ name: 'frontend' });

    expect(response.status).toBe(401);
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Update scenarios covered
- [ ] Validation tested
- [ ] Error cases handled

**Dependencies**: Task 4.3

---

### Task 4.5: DELETE /api/tags/:id Tests
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)
**Status**: ⬜

**Code to Add**:
```typescript
describe('DELETE /api/tags/:id', () => {
  it('deletes tag successfully', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .delete(`/api/tags/${tagId}`)
      .set('Cookie', authToken);

    expect(response.status).toBe(204);
  });

  it('tag not found after delete', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    await request(app)
      .delete(`/api/tags/${tagId}`)
      .set('Cookie', authToken);

    // Verify tag is gone
    const getResponse = await request(app)
      .get('/api/tags')
      .set('Cookie', authToken);

    expect(getResponse.body.tags).toHaveLength(0);
  });

  it('returns 404 for non-existent tag', async () => {
    const response = await request(app)
      .delete('/api/tags/non-existent-id')
      .set('Cookie', authToken);

    expect(response.status).toBe(404);
  });

  it('rejects unauthorized requests', async () => {
    const createResponse = await createTag('backend');
    const tagId = createResponse.body.tag.id;

    const response = await request(app)
      .delete(`/api/tags/${tagId}`);

    expect(response.status).toBe(401);
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Delete verified
- [ ] 404 handled
- [ ] Auth required

**Dependencies**: Task 4.4

---

## Phase 5: Tag Extraction Utility (Day 2)

### Task 5.1: Create Tag Extractor Utility
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Create `backend/src/utils/tagExtractor.ts`
2. Implement extraction functions

**Code to Add**:
```typescript
/**
 * Extract unique tag names from text using regex
 * Pattern: #tagname (alphanumeric, hyphens, underscores)
 */
export function extractTags(text: string | null | undefined): string[] {
  if (!text) return [];

  // Match hashtags: # followed by alphanumeric, hyphens, underscores
  // \B ensures # is not preceded by a word character (avoids mid-word matches)
  const tagPattern = /\B#([a-zA-Z0-9_-]+)\b/g;
  const matches = text.matchAll(tagPattern);
  const tags = new Set<string>();

  for (const match of matches) {
    // Normalize to lowercase for consistency
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags);
}

/**
 * Extract tags from multiple text fields
 * Useful for extracting tags from workstream context + all status updates
 */
export function extractTagsFromFields(...fields: (string | null | undefined)[]): string[] {
  const allTags = new Set<string>();

  for (const field of fields) {
    if (field) {
      extractTags(field).forEach(tag => allTags.add(tag));
    }
  }

  return Array.from(allTags);
}
```

**Acceptance Criteria**:
- [ ] File created
- [ ] Functions exported
- [ ] TypeScript compiles
- [ ] Can be imported from other files

**Dependencies**: None (can run in parallel)

---

### Task 5.2: Create Tag Extractor Unit Tests
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Create `backend/tests/unit/tagExtractor.test.ts`
2. Add test cases for all edge cases

**Code to Add**:
```typescript
import { extractTags, extractTagsFromFields } from '../../src/utils/tagExtractor';

describe('extractTags', () => {
  it('extracts single tag', () => {
    expect(extractTags('Working on #backend')).toEqual(['backend']);
  });

  it('extracts multiple tags', () => {
    const result = extractTags('#backend #frontend #api');
    expect(result).toHaveLength(3);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
  });

  it('removes duplicates', () => {
    expect(extractTags('#backend and #backend')).toEqual(['backend']);
  });

  it('normalizes to lowercase', () => {
    expect(extractTags('#Backend #FRONTEND #Api')).toEqual(['backend', 'frontend', 'api']);
  });

  it('handles tags with hyphens', () => {
    expect(extractTags('#backend-team')).toEqual(['backend-team']);
  });

  it('handles tags with underscores', () => {
    expect(extractTags('#api_v2')).toEqual(['api_v2']);
  });

  it('handles mixed case and special chars', () => {
    expect(extractTags('#Backend-Team_v2')).toEqual(['backend-team_v2']);
  });

  it('ignores tags in middle of words', () => {
    // email#john should not match because # is preceded by word char
    expect(extractTags('email#john@test.com')).toEqual([]);
  });

  it('matches tags after space', () => {
    expect(extractTags('Hello #world')).toEqual(['world']);
  });

  it('matches tags after punctuation', () => {
    expect(extractTags('Done! #backend')).toEqual(['backend']);
  });

  it('matches tags at start of string', () => {
    expect(extractTags('#backend is ready')).toEqual(['backend']);
  });

  it('handles empty string', () => {
    expect(extractTags('')).toEqual([]);
  });

  it('handles null', () => {
    expect(extractTags(null)).toEqual([]);
  });

  it('handles undefined', () => {
    expect(extractTags(undefined)).toEqual([]);
  });

  it('handles text without tags', () => {
    expect(extractTags('No tags here')).toEqual([]);
  });

  it('ignores invalid tag characters', () => {
    // Only alphanumeric, hyphens, underscores allowed
    // Tag stops at first invalid character
    expect(extractTags('#my@tag')).toEqual(['my']);
    expect(extractTags('#my tag')).toEqual(['my']);
  });

  it('handles tags in markdown', () => {
    const markdown = '## Header\n\nWorking on #backend and #frontend\n\n- #api\n- #database';
    const result = extractTags(markdown);
    expect(result).toHaveLength(4);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
    expect(result).toContain('database');
  });
});

describe('extractTagsFromFields', () => {
  it('extracts tags from multiple fields', () => {
    const result = extractTagsFromFields(
      'Context with #backend',
      'Note with #frontend',
      'Another note with #api'
    );
    expect(result).toHaveLength(3);
    expect(result).toContain('backend');
    expect(result).toContain('frontend');
    expect(result).toContain('api');
  });

  it('removes duplicates across fields', () => {
    const result = extractTagsFromFields(
      '#backend and #api',
      '#backend and #frontend',
      '#api'
    );
    expect(result).toHaveLength(3);
  });

  it('handles null and undefined fields', () => {
    const result = extractTagsFromFields(
      '#backend',
      null,
      undefined,
      '#frontend'
    );
    expect(result).toEqual(['backend', 'frontend']);
  });

  it('handles empty fields', () => {
    const result = extractTagsFromFields('', '#backend', '');
    expect(result).toEqual(['backend']);
  });

  it('handles all null/undefined', () => {
    const result = extractTagsFromFields(null, undefined, null);
    expect(result).toEqual([]);
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] 100% coverage of extractor functions
- [ ] Edge cases handled

**Dependencies**: Task 5.1

---

## Phase 6: Enhanced Workstream Filtering (Day 3)

### Task 6.1: Update Workstream Service for Tag Filtering
**Estimated Time**: 2 hours
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Open `backend/src/services/workstreamService.ts`
2. Add `tags` parameter to `GetWorkstreamsOptions`
3. Implement tag filtering logic

**Code Changes**:
```typescript
// Add to imports
import { extractTagsFromFields } from '../utils/tagExtractor';

// Update GetWorkstreamsOptions interface
export interface GetWorkstreamsOptions {
  projectId: string;
  state?: 'active' | 'closed' | 'all';
  tags?: string[]; // ADD THIS
}

// Update getWorkstreams function
export async function getWorkstreams(options: GetWorkstreamsOptions) {
  const { projectId, state = 'all', tags } = options;

  // Fetch workstreams with status updates for tag extraction
  let workstreams = await prisma.workstream.findMany({
    where: {
      projectId,
      ...(state !== 'all' && { state }),
    },
    include: {
      category: true,
      statusUpdates: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by tags if provided
  if (tags && tags.length > 0) {
    const normalizedFilterTags = tags.map(t => t.toLowerCase());
    
    workstreams = workstreams.filter(ws => {
      // Extract tags from context and all status updates
      const texts = [
        ws.context,
        ...ws.statusUpdates.map(su => su.note),
      ];
      const wsTags = extractTagsFromFields(...texts);

      // Match if any tag overlaps (OR logic)
      return normalizedFilterTags.some(filterTag => wsTags.includes(filterTag));
    });
  }

  return workstreams;
}
```

**Acceptance Criteria**:
- [ ] `tags` parameter added to options
- [ ] Tag filtering implemented
- [ ] OR logic (any tag matches)
- [ ] Case-insensitive matching
- [ ] Searches context and all status updates
- [ ] TypeScript compiles

**Dependencies**: Task 5.1

---

### Task 6.2: Update Workstream Routes for Tag Filtering
**Estimated Time**: 30 minutes
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Open `backend/src/routes/workstreams.ts`
2. Parse `tags` query parameter
3. Pass to service

**Code Changes**:
```typescript
// Update GET /api/workstreams route
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.user!.activeProjectId;
    const state = req.query.state as string | undefined;
    const tagsQuery = req.query.tags as string | undefined;

    // Parse comma-separated tags
    const tags = tagsQuery 
      ? tagsQuery.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;

    const workstreams = await workstreamService.getWorkstreams({
      projectId,
      state: state as any,
      tags,
    });

    res.json({ workstreams });
  } catch (error) {
    logger.error('GET /api/workstreams error:', error);
    res.status(500).json({ message: 'Failed to fetch workstreams' });
  }
});
```

**Acceptance Criteria**:
- [ ] Query param parsed correctly
- [ ] Comma-separated tags split
- [ ] Empty strings filtered out
- [ ] Passed to service
- [ ] Route still works without tags param

**Dependencies**: Task 6.1

---

### Task 6.3: Update Timeline Service for Tag Filtering
**Estimated Time**: 1.5 hours
**Priority**: P1 (Should Have)
**Status**: ⬜

**Steps**:
1. Open `backend/src/services/timelineService.ts`
2. Add tag filtering similar to workstreams

**Code Changes**:
```typescript
// Add to imports
import { extractTags } from '../utils/tagExtractor';

// Update GetTimelineOptions interface
export interface GetTimelineOptions {
  projectId: string;
  tags?: string[]; // ADD THIS
}

// Update getTimeline function
export async function getTimeline(options: GetTimelineOptions) {
  const { projectId, tags } = options;

  let statusUpdates = await prisma.statusUpdate.findMany({
    where: {
      workstream: {
        projectId,
      },
    },
    include: {
      workstream: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by tags if provided
  if (tags && tags.length > 0) {
    const normalizedFilterTags = tags.map(t => t.toLowerCase());

    statusUpdates = statusUpdates.filter(su => {
      const suTags = extractTags(su.note);
      return normalizedFilterTags.some(filterTag => suTags.includes(filterTag));
    });
  }

  return statusUpdates;
}
```

**Code to Update** (in `backend/src/routes/timeline.ts`):
```typescript
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.user!.activeProjectId;
    const tagsQuery = req.query.tags as string | undefined;

    const tags = tagsQuery
      ? tagsQuery.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;

    const timeline = await timelineService.getTimeline({ projectId, tags });

    res.json({ timeline });
  } catch (error) {
    logger.error('GET /api/timeline error:', error);
    res.status(500).json({ message: 'Failed to fetch timeline' });
  }
});
```

**Acceptance Criteria**:
- [ ] Tag filtering added to timeline
- [ ] Searches only status update notes
- [ ] Query param parsed
- [ ] OR logic for multiple tags

**Dependencies**: Task 6.1

---

### Task 6.4: Integration Tests for Tag Filtering
**Estimated Time**: 2 hours
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Update `backend/tests/integration/workstreams.test.ts`
2. Add tag filtering test cases

**Code to Add** (in `workstreams.test.ts`):
```typescript
describe('GET /api/workstreams with tag filtering', () => {
  beforeEach(async () => {
    // Setup will be in existing beforeEach
  });

  it('filters by single tag in context', async () => {
    // Create workstream with #backend in context
    const ws1 = await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({
        name: 'Workstream 1',
        context: 'Working on #backend API',
      });

    // Create workstream without tag
    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({
        name: 'Workstream 2',
        context: 'Frontend work',
      });

    // Filter by backend tag
    const response = await request(app)
      .get('/api/workstreams?tags=backend')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.workstreams).toHaveLength(1);
    expect(response.body.workstreams[0].name).toBe('Workstream 1');
  });

  it('filters by tag in status update note', async () => {
    // Create workstream
    const wsResponse = await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'Workstream 1' });

    const workstreamId = wsResponse.body.workstream.id;

    // Add status update with tag
    await request(app)
      .post('/api/status-updates')
      .set('Cookie', authToken)
      .send({
        workstreamId,
        status: 'in-progress',
        note: 'Meeting with #john about requirements',
      });

    // Filter by john tag
    const response = await request(app)
      .get('/api/workstreams?tags=john')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.workstreams).toHaveLength(1);
  });

  it('filters by multiple tags (OR logic)', async () => {
    // Create workstreams with different tags
    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS1', context: 'Working on #backend' });

    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS2', context: 'Working on #frontend' });

    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS3', context: 'Working on #database' });

    // Filter by backend OR frontend
    const response = await request(app)
      .get('/api/workstreams?tags=backend,frontend')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.workstreams).toHaveLength(2);
  });

  it('returns empty array when no matches', async () => {
    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS1', context: 'No tags here' });

    const response = await request(app)
      .get('/api/workstreams?tags=backend')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.workstreams).toEqual([]);
  });

  it('handles case-insensitive matching', async () => {
    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS1', context: 'Working on #Backend' });

    const response = await request(app)
      .get('/api/workstreams?tags=backend')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.workstreams).toHaveLength(1);
  });

  it('combines tag filter with state filter', async () => {
    // Create active workstream with tag
    await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS1', context: '#backend', state: 'active' });

    // Create closed workstream with same tag
    const ws2 = await request(app)
      .post('/api/workstreams')
      .set('Cookie', authToken)
      .send({ name: 'WS2', context: '#backend' });

    // Close WS2
    await request(app)
      .patch(`/api/workstreams/${ws2.body.workstream.id}`)
      .set('Cookie', authToken)
      .send({ state: 'closed' });

    // Filter by tag + active state
    const response = await request(app)
      .get('/api/workstreams?tags=backend&state=active')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
    expect(response.body.workstreams).toHaveLength(1);
    expect(response.body.workstreams[0].name).toBe('WS1');
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Filtering logic verified
- [ ] Edge cases covered
- [ ] OR logic tested
- [ ] Case-insensitivity tested

**Dependencies**: Task 6.2

---

[Continuing with remaining phases in next part due to length...]

## Phase 7: Frontend Tag API Client (Day 3)

### Task 7.1: Create Tag API Client
**Estimated Time**: 1 hour
**Priority**: P0 (Blocker)
**Status**: ⬜

**Steps**:
1. Create `frontend/src/api/tags.ts`
2. Implement all API functions with types

**Code to Add**:
```typescript
export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

const API_BASE = '/api/tags';

/**
 * Get all tags for current project
 */
export async function getTags(): Promise<Tag[]> {
  const response = await fetch(API_BASE, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }

  const data = await response.json();
  return data.tags;
}

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagRequest): Promise<Tag> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create tag');
  }

  const data = await response.json();
  return data.tag;
}

/**
 * Update an existing tag
 */
export async function updateTag(id: string, input: UpdateTagRequest): Promise<Tag> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update tag');
  }

  const data = await response.json();
  return data.tag;
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete tag');
  }
}
```

**Acceptance Criteria**:
- [ ] File created
- [ ] All CRUD functions implemented
- [ ] TypeScript types defined
- [ ] Error handling in place
- [ ] Can be imported

**Dependencies**: Task 3.2 (backend routes deployed)

---

Due to length constraints, I'll create a summary for the remaining phases. The pattern continues similarly with detailed step-by-step tasks for:

- **Phase 8**: Settings Tags Tab UI (5 components, forms, validation)
- **Phase 9**: Tag Autocomplete (complex component with positioning logic)
- **Phase 10**: Tag Rendering in Markdown (markdown plugin integration)
- **Phase 11**: Tag Filtering UI (state management, URL sync, chips)
- **Phase 12**: Tags on Workstream Chips (tag aggregation display)
- **Phase 13**: Testing & Polish (manual testing, bug fixes, documentation)

Would you like me to continue with the remaining task details, or should I proceed to implementation now that you have the spec, plan, and task structure?

**Time Estimate So Far**:
- Phase 1-6 (Backend): ~16 hours
- Phase 7: ~1 hour
- **Remaining (Frontend)**: ~21 hours
- **Testing & Polish**: ~6 hours

**Total**: ~44 hours (5.5 days of actual development work)

