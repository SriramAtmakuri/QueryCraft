import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'querycraft_theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

export function useTheme() {
  const { user, token } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });

  useEffect(() => {
    const saved = (user?.theme as Theme) || (localStorage.getItem(THEME_KEY) as Theme) || 'system';
    setThemeState(saved);
    applyTheme(saved);
  }, [user]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);

    if (token) {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://querycraft-uaqy.onrender.com';
      fetch(`${API_BASE}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: t })
      }).catch(() => {});
    }
  };

  return { theme, setTheme };
}
