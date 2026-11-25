export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "swatch.theme.v1";

const listeners = new Set<() => void>();

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  listeners.forEach((notify) => notify());
}

export function subscribeTheme(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}
