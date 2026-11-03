import type { AuthenticatedSession, Portal } from './authApi';

export const SESSION_STORAGE_KEY = 'campus_connect_auth_session';

export interface StoredSessionPayload {
  readonly session: AuthenticatedSession;
  readonly portal: Portal;
  readonly storedAt: number; // Unix timestamp in milliseconds
}

export function saveStoredSession(session: AuthenticatedSession, portal: Portal): void {
  try {
    const payload: StoredSessionPayload = {
      session,
      portal,
      storedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
    sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } catch {
    // Gracefully handle storage quota or private-browsing restrictions
  }
}

export function getStoredSession(): { session: AuthenticatedSession; portal: Portal; storedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) ?? localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as Partial<StoredSessionPayload>;
    if (
      !payload ||
      !payload.session ||
      typeof payload.session.accessToken !== 'string' ||
      typeof payload.session.expiresIn !== 'number' ||
      typeof payload.storedAt !== 'number'
    ) {
      clearStoredSession();
      return null;
    }

    const elapsedSeconds = (Date.now() - payload.storedAt) / 1000;
    if (elapsedSeconds >= payload.session.expiresIn) {
      clearStoredSession();
      return null;
    }

    const portal: Portal = payload.portal === 'PLACEMENT' ? 'PLACEMENT' : 'INSTITUTE';
    return {
      session: payload.session,
      portal,
      storedAt: payload.storedAt,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Gracefully handle storage errors
  }
}
