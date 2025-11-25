import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  theme?: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string; theme?: string }) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_KEY = 'querycraft_token';
const REFRESH_KEY = 'querycraft_refresh';
const API_BASE = import.meta.env.VITE_API_URL || 'https://querycraft-uaqy.onrender.com';

async function authPost(path: string, body: object, token?: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const storeTokens = (accessToken: string, refreshToken?: string) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    setToken(accessToken);
  };

  const clearTokens = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    try {
      const data = await authPost('/api/auth/refresh', { refreshToken });
      storeTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      clearTokens();
      return null;
    }
  }, []);

  // Validate token on mount; refresh if needed
  useEffect(() => {
    const validate = async () => {
      const t = localStorage.getItem(ACCESS_KEY);
      if (!t) { setIsLoading(false); return; }

      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const r2 = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${newToken}` } });
          if (r2.ok) setUser((await r2.json()).user);
          else clearTokens();
        }
      }
      setIsLoading(false);
    };
    validate();
  }, [refreshAccessToken]);

  // Auto-refresh access token 2 min before expiry (access token = 15min)
  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => refreshAccessToken(), 13 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [token, refreshAccessToken]);

  const login = async (email: string, password: string) => {
    const data = await authPost('/api/auth/login', { email, password });
    storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await authPost('/api/auth/register', { email, password, name });
    storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      authPost('/api/auth/logout', { refreshToken }, token).catch(() => {});
    }
    clearTokens();
  };

  const updateProfile = async (data: { name?: string; currentPassword?: string; newPassword?: string; theme?: string }) => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Update failed');
    setUser(json.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
