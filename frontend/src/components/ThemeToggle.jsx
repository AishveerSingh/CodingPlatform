import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <button
      className="theme-toggle-button"
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
      title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-toggle-copy">
        <small>Theme</small>
        <strong>{isDarkTheme ? "Dark" : "Light"}</strong>
      </span>
      <span className={`theme-toggle-track ${isDarkTheme ? "dark" : "light"}`} aria-hidden="true">
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}
