import { useEffect, useState } from "react";

/** Shared light/dark preference for vendor till + admin. */
export const THEME_STORAGE_KEY = "inuabiz-theme";
const LEGACY_ADMIN_THEME_KEY = "inuabiz-admin-theme";

function readStoredTheme(): boolean | null {
  if (typeof window === "undefined") return null;
  const stored =
    window.localStorage.getItem(THEME_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_ADMIN_THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return null;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useAppTheme() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    const next = stored ?? systemPrefersDark();
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    setReady(true);
  }, []);

  const onDarkChange = (value: boolean) => {
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    window.localStorage.setItem(THEME_STORAGE_KEY, value ? "dark" : "light");
    // Keep legacy key in sync so older admin sessions stay aligned.
    window.localStorage.setItem(LEGACY_ADMIN_THEME_KEY, value ? "dark" : "light");
  };

  return { dark, onDarkChange, ready };
}
