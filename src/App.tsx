import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { LogList } from "./components/LogList";
import { StatusBar } from "./components/StatusBar";
import { LeftToolbar } from "./components/LeftToolbar";
import { useLogStore } from "./stores/logStore";
import { useDeviceMonitor } from "./hooks/useDeviceMonitor";
import { useAutoSelectDevice } from "./hooks/useAutoSelectDevice";

function App() {
  const { settings } = useLogStore();

  // Monitor device connection/disconnection events
  useDeviceMonitor();

  // Auto-select device on startup
  useAutoSelectDevice();

  // Apply theme based on settings
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    if (settings.theme === "system") {
      // Follow system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      applyTheme(settings.theme === "dark");
    }
  }, [settings.theme]);

  return (
    <div className="h-full flex flex-col bg-surface transition-theme">
      {/* Top Toolbar with Filter */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Toolbar */}
        <LeftToolbar />

        {/* Log List */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <LogList />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;

