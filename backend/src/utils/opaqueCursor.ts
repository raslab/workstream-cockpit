import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export interface OpaqueCursorPayload {
  v: 1;
  kind: string;
  createdAt: string;
  id: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function cursorKey(): Buffer {
  const secret =
    process.env.CURSOR_SECRET ||
    process.env.SESSION_SECRET ||
    'workstream-cockpit-local-cursor-secret';
  return createHash('sha256').update(secret).digest();
}

export function encodeOpaqueCursor(payload: OpaqueCursorPayload): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, cursorKey(), iv, { authTagLength: AUTH_TAG_LENGTH });
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
}

export function decodeOpaqueCursor(
  cursor: string | undefined,
  kind: string,
  errorMessage = 'Invalid cursor',
): OpaqueCursorPayload | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url');
    if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) throw new Error('cursor too short');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, cursorKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      'utf8',
    );
    const parsed = JSON.parse(plaintext) as OpaqueCursorPayload;
    if (
      parsed.v !== 1 ||
      parsed.kind !== kind ||
      typeof parsed.id !== 'string' ||
      !parsed.createdAt
    ) {
      throw new Error('bad cursor payload');
    }
    if (Number.isNaN(new Date(parsed.createdAt).getTime())) throw new Error('bad cursor date');
    return parsed;
  } catch {
    throw new Error(errorMessage);
  }
}
