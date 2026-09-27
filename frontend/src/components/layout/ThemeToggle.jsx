import { useEffect, useRef, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

/**
 * Light/dark theme switch.
 * - The `dark` class lives on <html> (set before first paint by index.html).
 * - Choice is persisted in localStorage["theme"] (default: dark).
 * - Adds `theme-anim` to <html> for ~400ms so the palette cross-fades.
 */
function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("theme") !== "light";
    } catch {
      return true;
    }
  });

  const firstRun = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* storage unavailable — theme stays session-only */
    }

    // Cross-fade only for real toggles in a visible tab — hidden/background
    // tabs freeze CSS transitions, which would leave stale computed colors.
    if (firstRun.current) {
      firstRun.current = false;
      return undefined;
    }
    if (document.visibilityState !== "visible") return undefined;

    root.classList.add("theme-anim");
    const id = setTimeout(() => root.classList.remove("theme-anim"), 450);
    return () => clearTimeout(id);
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light mode" : "Dark mode"}
      className={
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border " +
        "border-slate-200 bg-white text-slate-600 shadow-sm transition-all " +
        "duration-200 hover:-translate-y-0.5 hover:border-blue-300 " +
        "hover:text-blue-600 " +
        className
      }
    >
      {dark ? (
        <FiSun className="h-[18px] w-[18px] transition-transform duration-300" />
      ) : (
        <FiMoon className="h-[18px] w-[18px] transition-transform duration-300" />
      )}
    </button>
  );
}

export default ThemeToggle;
