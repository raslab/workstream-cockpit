import {
  createPerson,
  findPersonByEmail,
  findPersonById,
  getOrCreatePerson,
} from '../../src/services/personService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
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

describe('PersonService', () => {
  describe('createPerson', () => {
    it('should create a new person with valid data', async () => {
      const person = await createPerson({
        email: 'newuser@example.com',
        name: 'New User',
      });

      expect(person).toBeDefined();
      expect(person.id).toBeDefined();
      expect(person.email).toBe('newuser@example.com');
      expect(person.name).toBe('New User');
      expect(person.createdAt).toBeDefined();
    });

    it('should throw error when creating person with duplicate email', async () => {
      await createTestPerson({ email: 'duplicate@example.com' });

      await expect(
        createPerson({
          email: 'duplicate@example.com',
          name: 'Duplicate User',
        })
      ).rejects.toThrow();
    });
  });

  describe('findPersonByEmail', () => {
    it('should find existing person by email', async () => {
      const created = await createTestPerson({ email: 'find@example.com', name: 'Find Me' });

      const found = await findPersonByEmail('find@example.com');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('find@example.com');
      expect(found?.name).toBe('Find Me');
    });

    it('should return null when person does not exist', async () => {
      const found = await findPersonByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });
  });

  describe('findPersonById', () => {
    it('should find existing person by ID', async () => {
      const created = await createTestPerson({ email: 'findbyid@example.com', name: 'Find By ID' });

      const found = await findPersonById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('findbyid@example.com');
      expect(found?.name).toBe('Find By ID');
    });

    it('should return null when person ID does not exist', async () => {
      const found = await findPersonById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('getOrCreatePerson', () => {
    it('should return existing person if email exists', async () => {
      const existing = await createTestPerson({
        email: 'existing@example.com',
        name: 'Existing User',
      });

      const person = await getOrCreatePerson({
        email: 'existing@example.com',
        name: 'Different Name',
      });

      expect(person.id).toBe(existing.id);
      expect(person.email).toBe('existing@example.com');
      expect(person.name).toBe('Existing User'); // Should keep original name
    });

    it('should create new person if email does not exist', async () => {
      const person = await getOrCreatePerson({
        email: 'newperson@example.com',
        name: 'New Person',
      });

      expect(person).toBeDefined();
      expect(person.id).toBeDefined();
      expect(person.email).toBe('newperson@example.com');
      expect(person.name).toBe('New Person');
    });
  });
});
