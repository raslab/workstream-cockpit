import {
  createProject,
  getProjectsByPersonId,
  getProjectById,
  updateProject,
  createDefaultProject,
} from '../../src/services/projectService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  createTestProject,
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

describe('ProjectService', () => {
  describe('createProject', () => {
    it('should create a new project for a person', async () => {
      const person = await createTestPerson();

      const project = await createProject({
        personId: person.id,
        name: 'My New Project',
      });

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.personId).toBe(person.id);
      expect(project.name).toBe('My New Project');
      expect(project.createdAt).toBeDefined();
    });
  });

  describe('getProjectsByPersonId', () => {
    it('should return all projects for a person', async () => {
      const person = await createTestPerson();
      await createTestProject(person.id, { name: 'Project 1' });
      await createTestProject(person.id, { name: 'Project 2' });

      const projects = await getProjectsByPersonId(person.id);

      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('Project 1');
      expect(projects[1].name).toBe('Project 2');
    });

    it('should return empty array when person has no projects', async () => {
      const person = await createTestPerson();

      const projects = await getProjectsByPersonId(person.id);

      expect(projects).toEqual([]);
    });

    it('should return projects in ascending order by creation date', async () => {
      const person = await createTestPerson();
      
      // Create projects with small delay to ensure different timestamps
      const project1 = await createTestProject(person.id, { name: 'First Project' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const project2 = await createTestProject(person.id, { name: 'Second Project' });

      const projects = await getProjectsByPersonId(person.id);

      expect(projects[0].id).toBe(project1.id);
      expect(projects[1].id).toBe(project2.id);
    });
  });

  describe('getProjectById', () => {
    it('should return project when it belongs to the person', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id, { name: 'My Project' });

      const found = await getProjectById(project.id, person.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(project.id);
      expect(found?.name).toBe('My Project');
    });

    it('should return null when project does not belong to person', async () => {
      const person1 = await createTestPerson({ email: 'user1@example.com' });
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project = await createTestProject(person1.id);

      const found = await getProjectById(project.id, person2.id);

      expect(found).toBeNull();
    });

    it('should return null when project does not exist', async () => {
      const person = await createTestPerson();

      const found = await getProjectById('00000000-0000-0000-0000-000000000000', person.id);

      expect(found).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update project name', async () => {
      const person = await createTestPerson();
      const project = await createTestProject(person.id, { name: 'Old Name' });

      const updated = await updateProject(project.id, person.id, 'New Name');

      expect(updated.name).toBe('New Name');
      expect(updated.id).toBe(project.id);
    });

    it('should throw error when updating project that does not belong to person', async () => {
      const person1 = await createTestPerson({ email: 'user1@example.com' });
      const person2 = await createTestPerson({ email: 'user2@example.com' });
      const project = await createTestProject(person1.id);

      await expect(updateProject(project.id, person2.id, 'Hacked Name')).rejects.toThrow(
        'Project not found or access denied'
      );
    });
  });

  describe('createDefaultProject', () => {
    it('should create a default project with standard name', async () => {
      const person = await createTestPerson();

      const project = await createDefaultProject(person.id);

      expect(project).toBeDefined();
      expect(project.personId).toBe(person.id);
      expect(project.name).toBe('My Workstreams');
    });
  });
});
