import {
  createCategory,
  getCategoriesByProjectId,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createDefaultCategories,
  reorderCategories,
} from '../../src/services/categoryService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
  createTestCategory,
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

describe('CategoryService', () => {
  describe('createCategory', () => {
    it('should create a new category for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const category = await createCategory({
        projectId: project.id,
        name: 'urgent',
        color: '#FF0000',
        sortOrder: 5,
      });

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.projectId).toBe(project.id);
      expect(category.name).toBe('urgent');
      expect(category.color).toBe('#FF0000');
      expect(category.sortOrder).toBe(5);
    });

    it('should use default sort order of 0 if not provided', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const category = await createCategory({
        projectId: project.id,
        name: 'default-order',
        color: '#000000',
      });

      expect(category.sortOrder).toBe(0);
    });
  });

  describe('getCategoriesByProjectId', () => {
    it('should return all categories for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      
      await createTestCategory(project.id, { name: 'category1', sortOrder: 1 });
      await createTestCategory(project.id, { name: 'category2', sortOrder: 0 });

      const categories = await getCategoriesByProjectId(project.id);

      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('category2'); // sortOrder 0 comes first
      expect(categories[1].name).toBe('category1'); // sortOrder 1 comes second
    });

    it('should return empty array when project has no categories', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const categories = await getCategoriesByProjectId(project.id);

      expect(categories).toEqual([]);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when it belongs to the project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id, { name: 'mycategory', color: '#123456' });

      const found = await getCategoryById(category.id, project.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(category.id);
      expect(found?.name).toBe('mycategory');
      expect(found?.color).toBe('#123456');
    });

    it('should return null when category does not belong to project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const category = await createTestCategory(project1.id);

      const found = await getCategoryById(category.id, project2.id);

      expect(found).toBeNull();
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id, { name: 'oldname' });

      const updated = await updateCategory(category.id, project.id, { name: 'newname' });

      expect(updated.name).toBe('newname');
    });

    it('should update category color', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id, { color: '#000000' });

      const updated = await updateCategory(category.id, project.id, { color: '#FFFFFF' });

      expect(updated.color).toBe('#FFFFFF');
    });

    it('should update category sort order', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id, { sortOrder: 0 });

      const updated = await updateCategory(category.id, project.id, { sortOrder: 10 });

      expect(updated.sortOrder).toBe(10);
    });

    it('should throw error when updating category from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const category = await createTestCategory(project1.id);

      await expect(updateCategory(category.id, project2.id, { name: 'hacked' })).rejects.toThrow(
        'Category not found or access denied'
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id);

      await deleteCategory(category.id, project.id);

      const categories = await getCategoriesByProjectId(project.id);
      expect(categories).toHaveLength(0);
    });

    it('should unset category from workstreams when deleted', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category = await createTestCategory(project.id);
      const workstream = await createTestWorkstream(project.id, { categoryId: category.id });

      await deleteCategory(category.id, project.id);

      // Workstream should still exist but category should be null
      const { prisma } = await import('../helpers/testDb');
      const updatedWorkstream = await prisma.workstream.findUnique({
        where: { id: workstream.id },
      });
      
      expect(updatedWorkstream).toBeDefined();
      expect(updatedWorkstream?.categoryId).toBeNull();
    });

    it('should throw error when deleting category from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const category = await createTestCategory(project1.id);

      await expect(deleteCategory(category.id, project2.id)).rejects.toThrow(
        'Category not found or access denied'
      );
    });
  });

  describe('createDefaultCategories', () => {
    it('should create 4 default categories for a project', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const categories = await createDefaultCategories(project.id);

      expect(categories).toHaveLength(4);
      expect(categories[0].name).toBe('project');
      expect(categories[0].color).toBe('#9EC3FF'); // blue
      expect(categories[0].emoji).toBe('🎯');
      expect(categories[1].name).toBe('delegated');
      expect(categories[1].color).toBe('#DCB8FF'); // purple
      expect(categories[1].emoji).toBe('👥');
      expect(categories[2].name).toBe('ongoing');
      expect(categories[2].color).toBe('#74D898'); // green
      expect(categories[2].emoji).toBe('🔄');
      expect(categories[3].name).toBe('watching');
      expect(categories[3].color).toBe('#B5BAC5'); // gray
      expect(categories[3].emoji).toBe('👀');
    });

    it('should create categories with correct sort order', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);

      const categories = await createDefaultCategories(project.id);

      expect(categories[0].sortOrder).toBe(0);
      expect(categories[1].sortOrder).toBe(1);
      expect(categories[2].sortOrder).toBe(2);
      expect(categories[3].sortOrder).toBe(3);
    });
  });

  describe('reorderCategories', () => {
    it('should update sort order for multiple categories', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id);
      const category1 = await createTestCategory(project.id, { name: 'category1', sortOrder: 0 });
      const category2 = await createTestCategory(project.id, { name: 'category2', sortOrder: 1 });
      const category3 = await createTestCategory(project.id, { name: 'category3', sortOrder: 2 });

      // Reorder: category3 first, category1 second, category2 third
      await reorderCategories(project.id, [category3.id, category1.id, category2.id]);

      const categories = await getCategoriesByProjectId(project.id);
      
      expect(categories[0].id).toBe(category3.id);
      expect(categories[0].sortOrder).toBe(0);
      expect(categories[1].id).toBe(category1.id);
      expect(categories[1].sortOrder).toBe(1);
      expect(categories[2].id).toBe(category2.id);
      expect(categories[2].sortOrder).toBe(2);
    });

    it('should throw error when reordering categories from different project', async () => {
      const person = await createTestPerson();
      const project1 = await createTestProject(person.id);
      const project2 = await createTestProject(person.id);
      const category = await createTestCategory(project1.id);

      await expect(
        reorderCategories(project2.id, [category.id])
      ).rejects.toThrow('One or more categories not found or access denied');
    });
  });
});
