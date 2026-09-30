import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { clearScreenCache } from '../offline/screenCache';
import { setAuthHandlers } from '../api/client';
import { authApi } from '../api/endpoints';
import { AuthTokens, User } from '../api/types';
import { resetLocalDb } from '../offline/database';

// Claves de almacenamiento seguro. Se conservan los nombres históricos para no
// cerrar la sesión de los usuarios Beta al actualizar por OTA.
const TOKENS_KEY = 'tocosas.tokens';
const USER_KEY = 'tocosas.user';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, acceptsDataPolicy?: boolean) => Promise<void>;
  /**
   * Cierra la sesión. `wipeLocal` (BT-014) borra además la caché local de movimientos y
   * la cola offline: obligatorio cuando el usuario cierra sesión o borra su cuenta a
   * propósito, para que otra cuenta en el mismo teléfono no vea datos ajenos. En el
   * cierre forzado por token vencido NO se borra, para no perder movimientos pendientes.
   */
  logout: (opts?: { wipeLocal?: boolean }) => Promise<void>;
  /** Vuelve a leer /auth/me (onboarding, consentimiento, plan) y lo persiste. */
  refreshMe: () => Promise<void>;
  /** Actualiza el usuario en memoria y en disco (p. ej. onboardingDone). */
  patchUser: (patch: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    try {
      const [rawTokens, rawUser] = await Promise.all([
        SecureStore.getItemAsync(TOKENS_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (rawTokens) {
        set({
          tokens: JSON.parse(rawTokens),
          user: rawUser ? JSON.parse(rawUser) : null,
        });
      }
    } finally {
      set({ hydrated: true });
    }
    // Best-effort: sincroniza banderas del servidor sin bloquear el arranque.
    if (get().tokens) void get().refreshMe();
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      await persist(res.tokens, res.user);
      set({ tokens: res.tokens, user: res.user });
      void get().refreshMe();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, fullName, acceptsDataPolicy) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(email, password, fullName, acceptsDataPolicy);
      // Usuario nuevo: el recorrido inicial empieza en la app (FIN-038).
      const user: User = { ...res.user, onboardingDone: false, dataConsentAt: acceptsDataPolicy ? new Date().toISOString() : null };
      // BT-014: una cuenta nueva empieza sin restos locales de otra cuenta en este teléfono.
      await resetLocalDb().catch(() => undefined);
      await persist(res.tokens, user);
      set({ tokens: res.tokens, user });
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  logout: async (opts) => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKENS_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    if (opts?.wipeLocal) {
      await resetLocalDb().catch(() => undefined);
      // BT-037: la caché de pantallas también (en web vive en localStorage).
      await clearScreenCache();
    }
    set({ tokens: null, user: null });
  },

  refreshMe: async () => {
    try {
      const me = await authApi.me();
      const merged = { ...(get().user ?? {}), ...me } as User;
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merged));
      set({ user: merged });
    } catch {
      /* sin red o sesión vencida: el guard del cliente ya lo maneja */
    }
  },

  patchUser: async (patch) => {
    const merged = { ...(get().user ?? { id: '', email: null, fullName: null }), ...patch } as User;
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merged));
    set({ user: merged });
  },
}));

async function persist(tokens: AuthTokens, user: User): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens)),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

// Conecta el store de auth con el cliente HTTP: tokens, refresh y logout.
setAuthHandlers({
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken ?? null,
  onRefreshed: async (tokens) => {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    useAuthStore.setState({ tokens });
  },
  onAuthFailure: async () => {
    await useAuthStore.getState().logout();
  },
});
