import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { LogList } from "./components/LogList";
import { StatusBar } from "./components/StatusBar";
import { LeftToolbar } from "./components/LeftToolbar";
import { useLogStore } from "./stores/logStore";

function App() {
  const { settings } = useLogStore();

  // Apply theme on mount
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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

