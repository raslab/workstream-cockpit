import crypto from 'crypto';
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
  verifyPersonalAccessToken,
} from '../../src/services/personalAccessTokenService';
import {
  cleanDatabase,
  setupTestDatabase,
  disconnectDatabase,
  createTestPerson,
  prisma,
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

describe('PersonalAccessTokenService', () => {
  describe('createPersonalAccessToken', () => {
    it('creates a bearer-suitable raw token once and persists only a hash plus metadata', async () => {
      const person = await createTestPerson();

      const result = await createPersonalAccessToken(person.id, {
        name: '  MCP client  ',
        scopes: ['mcp:read'],
      });

      expect(result.token).toMatch(/^wsc_pat_[A-Za-z0-9_-]{43,}$/);
      expect(result.personalAccessToken.name).toBe('MCP client');
      expect(result.personalAccessToken.scopes).toEqual(['mcp:read']);
      expect(result.personalAccessToken.tokenPrefix).toBe(result.token.slice(0, 20));
      expect(result.personalAccessToken).not.toHaveProperty('tokenHash');

      const persisted = await prisma.personalAccessToken.findUniqueOrThrow({
        where: { id: result.personalAccessToken.id },
      });
      expect(persisted.tokenHash).toHaveLength(64);
      expect(persisted.tokenHash).toBe(
        crypto.createHash('sha256').update(result.token).digest('hex')
      );
      expect(JSON.stringify(persisted)).not.toContain(result.token);
    });

    it.each([
      { name: '', scopes: ['mcp:read'], message: /name/i },
      { name: '   ', scopes: ['mcp:read'], message: /name/i },
      { name: 'a'.repeat(101), scopes: ['mcp:read'], message: /name/i },
      { name: 'x', scopes: [], message: /scope/i },
      { name: 'x', scopes: ['mcp:read', 'mcp:read'], message: /duplicate/i },
      { name: 'x', scopes: ['mcp:write'], message: /read/i },
      { name: 'x', scopes: ['mcp:write', 'mcp:read'], message: /order|scope/i },
      { name: 'x', scopes: ['admin'], message: /unknown|scope/i },
    ])('rejects invalid input %#', async ({ name, scopes, message }) => {
      const person = await createTestPerson({ email: `invalid-${Math.random()}@example.com` });

      await expect(
        createPersonalAccessToken(person.id, { name, scopes })
      ).rejects.toThrow(message);
    });

    it('rejects non-future expiresAt values', async () => {
      const person = await createTestPerson();

      await expect(
        createPersonalAccessToken(person.id, {
          name: 'expired',
          scopes: ['mcp:read'],
          expiresAt: new Date(Date.now() - 1000),
        })
      ).rejects.toThrow(/future|expires/i);
    });
  });

  describe('listPersonalAccessTokens', () => {
    it('lists only metadata for the owning person and never includes raw tokens or hashes', async () => {
      const owner = await createTestPerson({ email: 'owner@example.com' });
      const other = await createTestPerson({ email: 'other@example.com' });
      const created = await createPersonalAccessToken(owner.id, {
        name: 'Owner PAT',
        scopes: ['mcp:read', 'mcp:write'],
      });
      await createPersonalAccessToken(other.id, { name: 'Other PAT', scopes: ['mcp:read'] });

      const list = await listPersonalAccessTokens(owner.id);

      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        id: created.personalAccessToken.id,
        personId: owner.id,
        name: 'Owner PAT',
        scopes: ['mcp:read', 'mcp:write'],
        tokenPrefix: created.token.slice(0, 20),
      });
      expect(list[0]).not.toHaveProperty('tokenHash');
      expect(JSON.stringify(list)).not.toContain(created.token);
    });
  });

  describe('verifyPersonalAccessToken', () => {
    it('returns the issuing person and updates lastUsedAt for a valid token', async () => {
      const person = await createTestPerson();
      const created = await createPersonalAccessToken(person.id, {
        name: 'Verify PAT',
        scopes: ['mcp:read'],
      });

      const verified = await verifyPersonalAccessToken(created.token);

      expect(verified).toMatchObject({
        personId: person.id,
        scopes: ['mcp:read'],
      });
      expect(verified?.personalAccessToken.id).toBe(created.personalAccessToken.id);
      expect(verified?.person.email).toBe(person.email);

      const persisted = await prisma.personalAccessToken.findUniqueOrThrow({
        where: { id: created.personalAccessToken.id },
      });
      expect(persisted.lastUsedAt).toBeInstanceOf(Date);
    });

    it('rejects unknown, revoked, and expired tokens', async () => {
      const person = await createTestPerson();
      const revoked = await createPersonalAccessToken(person.id, {
        name: 'Revoked',
        scopes: ['mcp:read'],
      });
      await revokePersonalAccessToken(person.id, revoked.personalAccessToken.id);

      const expired = await createPersonalAccessToken(person.id, {
        name: 'Expired soon',
        scopes: ['mcp:read'],
        expiresAt: new Date(Date.now() + 60_000),
      });
      await prisma.personalAccessToken.update({
        where: { id: expired.personalAccessToken.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      await expect(verifyPersonalAccessToken('wsc_pat_notarealtoken')).resolves.toBeNull();
      await expect(verifyPersonalAccessToken(revoked.token)).resolves.toBeNull();
      await expect(verifyPersonalAccessToken(expired.token)).resolves.toBeNull();
    });
  });

  describe('revokePersonalAccessToken', () => {
    it('revokes owned tokens idempotently and does not revoke another user token', async () => {
      const owner = await createTestPerson({ email: 'owner-revoke@example.com' });
      const other = await createTestPerson({ email: 'other-revoke@example.com' });
      const owned = await createPersonalAccessToken(owner.id, { name: 'Owned', scopes: ['mcp:read'] });
      const otherPat = await createPersonalAccessToken(other.id, { name: 'Other', scopes: ['mcp:read'] });

      await expect(revokePersonalAccessToken(owner.id, owned.personalAccessToken.id)).resolves.toBeUndefined();
      await expect(revokePersonalAccessToken(owner.id, owned.personalAccessToken.id)).resolves.toBeUndefined();
      await expect(revokePersonalAccessToken(owner.id, otherPat.personalAccessToken.id)).resolves.toBeUndefined();

      const ownedPersisted = await prisma.personalAccessToken.findUniqueOrThrow({
        where: { id: owned.personalAccessToken.id },
      });
      const otherPersisted = await prisma.personalAccessToken.findUniqueOrThrow({
        where: { id: otherPat.personalAccessToken.id },
      });
      expect(ownedPersisted.revokedAt).toBeInstanceOf(Date);
      expect(otherPersisted.revokedAt).toBeNull();
    });
  });
});
