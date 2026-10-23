import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'dialog.theme';
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* Настройка работает и без хранилища. */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* Не мешаем переключению темы. */
    }
  }, [theme]);
  return {
    theme,
    toggleTheme: () =>
      setTheme((previous) => (previous === 'dark' ? 'light' : 'dark')),
  };
}
