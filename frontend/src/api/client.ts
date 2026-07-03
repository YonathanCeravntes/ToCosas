import Constants from 'expo-constants';

/**
 * Cliente HTTP mínimo sobre fetch. Inyecta el token de acceso y normaliza
 * errores. La URL base sale de EXPO_PUBLIC_API_URL o de app.json (extra.apiUrl).
 *
 * En dispositivo físico, `localhost` apunta al teléfono: usa la IP LAN del
 * backend (p. ej. http://192.168.1.20:3000/v1) vía EXPO_PUBLIC_API_URL.
 */
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ??
  'http://localhost:3000/v1';

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

type TokenGetter = () => string | null;
let getToken: TokenGetter = () => null;

/** Registra la función que provee el access token (la conecta el store de auth). */
export function setTokenGetter(fn: TokenGetter): void {
  getToken = fn;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      data?.error?.message ?? data?.message ?? `Error ${res.status}`;
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
