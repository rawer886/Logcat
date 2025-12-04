import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { FilterBar } from "./components/FilterBar";
import { LogList } from "./components/LogList";
import { StatusBar } from "./components/StatusBar";
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
      {/* Top Toolbar */}
      <Toolbar />

      {/* Filter Bar */}
      <FilterBar />

      {/* Main Content - Log List */}
      <LogList />

      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;

