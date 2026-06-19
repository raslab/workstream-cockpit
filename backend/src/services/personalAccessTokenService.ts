import * as crypto from 'crypto';
import { Person, PersonalAccessToken } from '@prisma/client';
import { prisma } from '../utils/db';

export const PERSONAL_ACCESS_TOKEN_PREFIX = 'wsc_pat_';
export const ALLOWED_PAT_SCOPES = ['mcp:read', 'mcp:write'] as const;
export type PersonalAccessTokenScope = (typeof ALLOWED_PAT_SCOPES)[number];

export interface CreatePersonalAccessTokenInput {
  name: string;
  scopes: string[];
  expiresAt?: Date | string | null;
}

export type SafePersonalAccessToken = Omit<PersonalAccessToken, 'tokenHash'>;

export interface CreatedPersonalAccessToken {
  token: string;
  personalAccessToken: SafePersonalAccessToken;
}

export interface VerifiedPersonalAccessToken {
  personId: string;
  person: Person;
  scopes: string[];
  personalAccessToken: SafePersonalAccessToken;
}

function withoutTokenHash(token: PersonalAccessToken): SafePersonalAccessToken {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenHash, ...safeToken } = token;
  return safeToken;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRawToken(): string {
  return `${PERSONAL_ACCESS_TOKEN_PREFIX}${crypto.randomBytes(32).toString('base64url')}`;
}

function validateName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('Personal access token name is required');
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Personal access token name is required');
  }
  if (trimmed.length > 100) {
    throw new Error('Personal access token name must be 100 characters or fewer');
  }

  return trimmed;
}

function validateScopes(scopes: unknown): PersonalAccessTokenScope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('At least one personal access token scope is required');
  }

  const seen = new Set<string>();
  for (const scope of scopes) {
    if (typeof scope !== 'string' || !ALLOWED_PAT_SCOPES.includes(scope as PersonalAccessTokenScope)) {
      throw new Error(`Unknown personal access token scope: ${String(scope)}`);
    }
    if (seen.has(scope)) {
      throw new Error(`Duplicate personal access token scope: ${scope}`);
    }
    seen.add(scope);
  }

  if (!seen.has('mcp:read')) {
    throw new Error('Personal access token scopes must include mcp:read');
  }

  const validReadOnly = scopes.length === 1 && scopes[0] === 'mcp:read';
  const validReadWrite =
    scopes.length === 2 && scopes[0] === 'mcp:read' && scopes[1] === 'mcp:write';
  if (!validReadOnly && !validReadWrite) {
    throw new Error('Personal access token scopes must be exactly [mcp:read] or [mcp:read, mcp:write]');
  }

  return scopes as PersonalAccessTokenScope[];
}

function validateExpiresAt(expiresAt: Date | string | null | undefined): Date | null {
  if (expiresAt == null) {
    return null;
  }

  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Personal access token expiresAt must be a valid date');
  }
  if (date.getTime() <= Date.now()) {
    throw new Error('Personal access token expiresAt must be in the future');
  }

  return date;
}

export async function createPersonalAccessToken(
  personId: string,
  input: CreatePersonalAccessTokenInput
): Promise<CreatedPersonalAccessToken> {
  const name = validateName(input.name);
  const scopes = validateScopes(input.scopes);
  const expiresAt = validateExpiresAt(input.expiresAt);
  const token = generateRawToken();
  const tokenHash = hashToken(token);

  const personalAccessToken = await prisma.personalAccessToken.create({
    data: {
      personId,
      name,
      tokenHash,
      tokenPrefix: token.slice(0, 20),
      scopes,
      expiresAt,
    },
  });

  return {
    token,
    personalAccessToken: withoutTokenHash(personalAccessToken),
  };
}

export async function listPersonalAccessTokens(personId: string): Promise<SafePersonalAccessToken[]> {
  const tokens = await prisma.personalAccessToken.findMany({
    where: { personId },
    orderBy: { createdAt: 'desc' },
  });

  return tokens.map(withoutTokenHash);
}

export async function revokePersonalAccessToken(personId: string, id: string): Promise<void> {
  await prisma.personalAccessToken.updateMany({
    where: {
      id,
      personId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function verifyPersonalAccessToken(
  token: string
): Promise<VerifiedPersonalAccessToken | null> {
  if (typeof token !== 'string' || !token.startsWith(PERSONAL_ACCESS_TOKEN_PREFIX)) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const personalAccessToken = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: { person: true },
  });

  if (!personalAccessToken) {
    return null;
  }
  if (personalAccessToken.revokedAt) {
    return null;
  }
  if (personalAccessToken.expiresAt && personalAccessToken.expiresAt <= now) {
    return null;
  }

  const updated = await prisma.personalAccessToken.update({
    where: { id: personalAccessToken.id },
    data: { lastUsedAt: now },
  });

  return {
    personId: personalAccessToken.personId,
    person: personalAccessToken.person,
    scopes: personalAccessToken.scopes,
    personalAccessToken: withoutTokenHash(updated),
  };
}
