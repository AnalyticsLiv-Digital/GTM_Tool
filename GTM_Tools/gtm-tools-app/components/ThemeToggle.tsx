"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Inline script that runs before paint to set data-theme on <html>,
 * preventing a flash of the wrong theme. Drop this into <head>.
 */
export const themeInitScript = `(function(){try{
  var s=localStorage.getItem('theme');
  var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

function getCurrent(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function useTheme() {
  // null on the server and during hydration, since the theme is only known in the browser
  const theme = useSyncExternalStore<Theme | null>(subscribe, getCurrent, () => null);

  const setTheme = (next: Theme) => {
    document.documentElement.classList.add("theme-changing");
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    // remove the class after the next paint so transitions resume normally
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("theme-changing");
      });
    });
  };

  return { theme, setTheme };
}

interface ThemeToggleProps {
  className?: string;
  size?: number;
}

export function ThemeToggle({ className = "", size = 16 }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (!theme) {
    // Reserve space during SSR/hydration to avoid layout shift
    return <span aria-hidden className={`inline-block w-9 h-9 ${className}`} />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`group inline-flex items-center justify-center w-9 h-9 rounded-md border border-[color:var(--line)] bg-[color:var(--card)] text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:border-[color:var(--edge)] transition-colors ${className}`}
    >
      {theme === "dark" ? (
        <Sun size={size} strokeWidth={1.8} className="transition-transform group-hover:rotate-12" />
      ) : (
        <Moon size={size} strokeWidth={1.8} className="transition-transform group-hover:-rotate-12" />
      )}
    </button>
  );
}
