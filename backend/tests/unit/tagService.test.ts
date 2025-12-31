import {
  createTag,
  getTagsByProjectId,
  getTagById,
  updateTag,
  deleteTag,
  createDefaultTags,
  reorderTags,
} from '../../src/services/tagService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestTag,
  createTestWorkstream,
} from '../helpers/testDb';

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('TagService', () => {
  describe('createTag', () => {
    it('should create a new tag for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const tag = await createTag({
        projectId: project.id,
        name: 'urgent',
        color: '#FF0000',
        sortOrder: 5,
      });

      expect(tag).toBeDefined();
      expect(tag.id).toBeDefined();
      expect(tag.projectId).toBe(project.id);
      expect(tag.name).toBe('urgent');
      expect(tag.color).toBe('#FF0000');
      expect(tag.sortOrder).toBe(5);
    });

    it('should use default sort order of 0 if not provided', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const tag = await createTag({
        projectId: project.id,
        name: 'default-order',
        color: '#000000',
      });

      expect(tag.sortOrder).toBe(0);
    });
  });

  describe('getTagsByProjectId', () => {
    it('should return all tags for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      
      await createTestTag(project.id, { name: 'tag1', sortOrder: 1 });
      await createTestTag(project.id, { name: 'tag2', sortOrder: 0 });

      const tags = await getTagsByProjectId(project.id);

      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('tag2'); // sortOrder 0 comes first
      expect(tags[1].name).toBe('tag1'); // sortOrder 1 comes second
    });

    it('should return empty array when project has no tags', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const tags = await getTagsByProjectId(project.id);

      expect(tags).toEqual([]);
    });
  });

  describe('getTagById', () => {
    it('should return tag when it belongs to the project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id, { name: 'mytag', color: '#123456' });

      const found = await getTagById(tag.id, project.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(tag.id);
      expect(found?.name).toBe('mytag');
      expect(found?.color).toBe('#123456');
    });

    it('should return null when tag does not belong to project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const tag = await createTestTag(project1.id);

      const found = await getTagById(tag.id, project2.id);

      expect(found).toBeNull();
    });
  });

  describe('updateTag', () => {
    it('should update tag name', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id, { name: 'oldname' });

      const updated = await updateTag(tag.id, project.id, { name: 'newname' });

      expect(updated.name).toBe('newname');
    });

    it('should update tag color', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id, { color: '#000000' });

      const updated = await updateTag(tag.id, project.id, { color: '#FFFFFF' });

      expect(updated.color).toBe('#FFFFFF');
    });

    it('should update tag sort order', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id, { sortOrder: 0 });

      const updated = await updateTag(tag.id, project.id, { sortOrder: 10 });

      expect(updated.sortOrder).toBe(10);
    });

    it('should throw error when updating tag from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const tag = await createTestTag(project1.id);

      await expect(updateTag(tag.id, project2.id, { name: 'hacked' })).rejects.toThrow(
        'Tag not found or access denied'
      );
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id);

      await deleteTag(tag.id, project.id);

      const tags = await getTagsByProjectId(project.id);
      expect(tags).toHaveLength(0);
    });

    it('should unset tag from workstreams when deleted', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag = await createTestTag(project.id);
      const workstream = await createTestWorkstream(project.id, { tagId: tag.id });

      await deleteTag(tag.id, project.id);

      // Workstream should still exist but tag should be null
      const { prisma } = await import('../helpers/testDb');
      const updatedWorkstream = await prisma.workstream.findUnique({
        where: { id: workstream.id },
      });
      
      expect(updatedWorkstream).toBeDefined();
      expect(updatedWorkstream?.tagId).toBeNull();
    });

    it('should throw error when deleting tag from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const tag = await createTestTag(project1.id);

      await expect(deleteTag(tag.id, project2.id)).rejects.toThrow(
        'Tag not found or access denied'
      );
    });
  });

  describe('createDefaultTags', () => {
    it('should create 4 default tags for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const tags = await createDefaultTags(project.id);

      expect(tags).toHaveLength(4);
      expect(tags[0].name).toBe('project');
      expect(tags[0].color).toBe('#3B82F6'); // blue
      expect(tags[1].name).toBe('ongoing');
      expect(tags[1].color).toBe('#10B981'); // green
      expect(tags[2].name).toBe('delegated');
      expect(tags[2].color).toBe('#8B5CF6'); // purple
      expect(tags[3].name).toBe('watching');
      expect(tags[3].color).toBe('#6B7280'); // gray
    });

    it('should create tags with correct sort order', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const tags = await createDefaultTags(project.id);

      expect(tags[0].sortOrder).toBe(0);
      expect(tags[1].sortOrder).toBe(1);
      expect(tags[2].sortOrder).toBe(2);
      expect(tags[3].sortOrder).toBe(3);
    });
  });

  describe('reorderTags', () => {
    it('should update sort order for multiple tags', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const tag1 = await createTestTag(project.id, { name: 'tag1', sortOrder: 0 });
      const tag2 = await createTestTag(project.id, { name: 'tag2', sortOrder: 1 });
      const tag3 = await createTestTag(project.id, { name: 'tag3', sortOrder: 2 });

      await reorderTags(project.id, [
        { tagId: tag3.id, sortOrder: 0 },
        { tagId: tag1.id, sortOrder: 1 },
        { tagId: tag2.id, sortOrder: 2 },
      ]);

      const tags = await getTagsByProjectId(project.id);
      
      expect(tags[0].id).toBe(tag3.id);
      expect(tags[0].sortOrder).toBe(0);
      expect(tags[1].id).toBe(tag1.id);
      expect(tags[1].sortOrder).toBe(1);
      expect(tags[2].id).toBe(tag2.id);
      expect(tags[2].sortOrder).toBe(2);
    });

    it('should throw error when reordering tags from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const tag = await createTestTag(project1.id);

      await expect(
        reorderTags(project2.id, [{ tagId: tag.id, sortOrder: 0 }])
      ).rejects.toThrow('One or more tags not found or access denied');
    });
  });
});
