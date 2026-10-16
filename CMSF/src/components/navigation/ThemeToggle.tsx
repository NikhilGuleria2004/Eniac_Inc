import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../app/theme/ThemeContext";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md shrink-0 transition-colors"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun aria-hidden="true" size={20} className="text-amber-300" />
      ) : (
        <Moon aria-hidden="true" size={20} className="text-gray-600" />
      )}
    </button>
  );
}
