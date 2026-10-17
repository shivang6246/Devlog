'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'devlog-theme';
const META_COLORS = { dark: '#050506', light: '#fafaf8' };

function applyTheme(theme) {
  const root = document.documentElement;
  // Suppress transitions for one frame so the whole page flips at once.
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode) — the choice just won't persist
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
      <path strokeLinejoin="round" d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

/** Light / dark switch. The initial theme is applied by the inline script in app/layout.js. */
export default function ThemeToggle({ className = '', withLabel = false }) {
  const [theme, setTheme] = useState(null); // null until mounted (avoids hydration mismatch)

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const next = theme === 'light' ? 'dark' : 'light';
  const label = `Switch to ${next} mode`;

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      className={`flex items-center gap-3 text-slate-300 transition hover:text-white ${className}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/15 transition hover:ring-indigo-500 hover:shadow-[0_0_18px_rgb(45_82_255/0.35)]">
        {/* Before mount render a neutral icon; afterwards show the mode you'll switch *to*. */}
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </span>
      {withLabel && (
        <span className="text-[11px] font-medium uppercase tracking-[0.3em]">
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </span>
      )}
    </button>
  );
}
