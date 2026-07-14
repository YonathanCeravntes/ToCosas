import Constants from 'expo-constants';
import { AuthTokens } from './types';

/**
 * Cliente HTTP sobre fetch con:
 *  - inyección del access token,
 *  - **refresh automático** ante un 401 (una sola vez, con reintento),
 *  - normalización de errores.
 *
 * La URL base sale de EXPO_PUBLIC_API_URL o de app.json (extra.apiUrl).
 *
 * INCIDENTE 2026-07-14: `eas update` (OTA) NO hereda el `env` del perfil de
 * build de eas.json, así que `EXPO_PUBLIC_API_URL` queda `undefined` en un
 * bundle publicado por OTA y la resolución cae al fallback. Por eso el fallback
 * DEBE ser producción (no `localhost`): un `localhost` aquí se traduce, en el
 * teléfono, en "el propio teléfono" → "Sin conexión con el backend". El
 * `extra.apiUrl` de `app.json` (que sí viaja en el manifiesto del OTA) también
 * apunta a producción. Para desarrollo local se usa `EXPO_PUBLIC_API_URL`.
 */
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ??
  'https://milla-backend.onrender.com/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthHandlers {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onRefreshed: (tokens: AuthTokens) => Promise<void> | void;
  onAuthFailure: () => Promise<void> | void;
}

let handlers: AuthHandlers = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onRefreshed: () => undefined,
  onAuthFailure: () => undefined,
};

/** Conecta el store de auth con el cliente (tokens + callbacks). */
export function setAuthHandlers(h: AuthHandlers): void {
  handlers = h;
}

// Deduplica refresh concurrentes: si varias requests fallan a la vez, se hace
// un solo refresh y todas reintentan con el token nuevo.
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = handlers.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { tokens: AuthTokens };
    await handlers.onRefreshed(data.tokens);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = handlers.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expirado → intentar refrescar una vez y reintentar.
  if (res.status === 401 && !retried && handlers.getRefreshToken()) {
    const ok = await tryRefresh();
    if (ok) return request<T>(method, path, body, true);
    await handlers.onAuthFailure();
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message ?? data?.message ?? `Error ${res.status}`;
    throw new ApiError(res.status, message, data?.error?.code);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  baseUrl: API_URL,
};
