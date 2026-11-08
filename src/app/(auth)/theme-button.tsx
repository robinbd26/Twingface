'use client';

import { useEffect, useState } from 'react';

export default function ThemeButton() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setDark(next === 'dark');
    try {
      localStorage.setItem('tf-theme', next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type='button' className='theme' onClick={toggle} aria-label='Toggle dark mode'>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
