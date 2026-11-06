/**
 * theme.ts - Theme manager for Akhar Studio
 * Supported themes: 'dark' (default) | 'darker' | 'light'
 */

export type ThemeMode = 'dark' | 'darker' | 'light';

export const THEMES: ThemeMode[] = ['dark', 'darker', 'light'];
export const DEFAULT_THEME: ThemeMode = 'dark';
export const STORAGE_KEY = 'scriptEditor.theme';

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
    return THEMES.includes(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemeMode): ThemeMode {
  const active = THEMES.includes(theme) ? theme : DEFAULT_THEME;
  const root = document.documentElement;

  root.setAttribute('data-theme', active);

  // Sync class for Tailwind and legacy integrations
  if (active === 'light') {
    root.classList.remove('dark', 'darker');
    root.classList.add('light');
  } else if (active === 'darker') {
    root.classList.remove('light');
    root.classList.add('dark', 'darker');
  } else {
    root.classList.remove('light', 'darker');
    root.classList.add('dark');
  }

  return active;
}

export function setTheme(theme: ThemeMode): ThemeMode {
  const active = applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, active);
  } catch {
    // LocalStorage might be unavailable in restricted environments
  }

  // Notify any outside observers, canvas or preview listeners
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: active } }));
  return active;
}

// Global initialization & multi-window sync
if (typeof window !== 'undefined') {
  (window as unknown as { Theme: { get: () => ThemeMode; set: (t: ThemeMode) => ThemeMode; apply: (t: ThemeMode) => ThemeMode; list: ThemeMode[] } }).Theme = {
    get: getStoredTheme,
    set: setTheme,
    apply: applyTheme,
    list: THEMES.slice(),
  };

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      applyTheme(getStoredTheme());
    }
  });

  // Apply on module load
  applyTheme(getStoredTheme());
}
