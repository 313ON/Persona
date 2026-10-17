'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    const stored = window.localStorage.getItem('charb-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') { setTheme(stored); document.documentElement.dataset.theme = stored; }
  }, []);
  function changeTheme(next: Theme) {
    setTheme(next); window.localStorage.setItem('charb-theme', next); document.documentElement.dataset.theme = next;
  }
  return <label className="theme-control"><span className="sr-only">پوسته نمایش</span><select aria-label="پوسته نمایش" value={theme} onChange={(event) => changeTheme(event.target.value as Theme)}><option value="system">سیستم</option><option value="light">روشن</option><option value="dark">تیره</option></select></label>;
}
