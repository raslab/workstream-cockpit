const STORAGE_KEY = 'workstream-cockpit-resource-change-client-id';

function randomClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getResourceChangeClientId(): string {
  if (typeof window === 'undefined') return randomClientId();
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const next = randomClientId();
    window.sessionStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return randomClientId();
  }
}
