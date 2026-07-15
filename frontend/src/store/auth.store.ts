import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setAuthHandlers } from '../api/client';
import { authApi } from '../api/endpoints';
import { AuthTokens, User } from '../api/types';

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
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
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
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      await persist(res.tokens, res.user);
      set({ tokens: res.tokens, user: res.user });
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, fullName) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(email, password, fullName);
      await persist(res.tokens, res.user);
      set({ tokens: res.tokens, user: res.user });
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKENS_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ tokens: null, user: null });
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
