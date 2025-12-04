import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  LogEntry,
  Device,
  ProcessInfo,
  FilterConfig,
  FilterPreset,
  AppSettings,
  LogStats,
  LogLevel,
} from "../types";
import {
  DEFAULT_FILTER,
  DEFAULT_SETTINGS,
} from "../types";
import { createSearchRegex, generateId } from "../lib/utils";

interface LogState {
  // Logs
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  
  // Devices
  devices: Device[];
  selectedDevice: Device | null;
  
  // Processes
  processes: ProcessInfo[];
  selectedProcess: ProcessInfo | null;
  
  // Filter
  filter: FilterConfig;
  filterPresets: FilterPreset[];
  
  // UI State
  isPaused: boolean;
  isConnected: boolean;
  isLoading: boolean;
  autoScroll: boolean;
  
  // Settings
  settings: AppSettings;
  
  // Stats
  stats: LogStats;
  
  // Actions - Logs
  addLog: (entry: LogEntry) => void;
  addLogs: (entries: LogEntry[]) => void;
  clearLogs: () => void;
  
  // Actions - Devices
  setDevices: (devices: Device[]) => void;
  selectDevice: (device: Device | null) => void;
  
  // Actions - Processes
  setProcesses: (processes: ProcessInfo[]) => void;
  selectProcess: (process: ProcessInfo | null) => void;
  
  // Actions - Filter
  setFilter: (filter: Partial<FilterConfig>) => void;
  resetFilter: () => void;
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (id: string) => void;
  deleteFilterPreset: (id: string) => void;
  
  // Actions - UI
  togglePause: () => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleTheme: () => void;
}

// Filter logs based on current filter configuration
function filterLogs(logs: LogEntry[], filter: FilterConfig): LogEntry[] {
  const regex = createSearchRegex(filter.searchText, filter.isRegex, filter.isCaseSensitive);
  
  return logs.filter((log) => {
    // Filter by level
    if (!filter.levels.includes(log.level)) {
      return false;
    }
    
    // Filter by tag
    if (filter.tags.length > 0) {
      const matchesTag = filter.tags.some((tag) =>
        log.tag.toLowerCase().includes(tag.toLowerCase())
      );
      if (!matchesTag) {
        return false;
      }
    }
    
    // Filter by package name (in tag)
    if (filter.packageName) {
      if (!log.tag.toLowerCase().includes(filter.packageName.toLowerCase())) {
        return false;
      }
    }
    
    // Filter by PID
    if (filter.pid !== undefined && log.pid !== filter.pid) {
      return false;
    }
    
    // Filter by search text
    if (regex) {
      const searchTarget = `${log.tag} ${log.message}`;
      if (!regex.test(searchTarget)) {
        return false;
      }
    }
    
    return true;
  });
}

// Calculate log statistics
function calculateStats(logs: LogEntry[], filteredLogs: LogEntry[]): LogStats {
  const byLevel: Record<LogLevel, number> = {
    V: 0,
    D: 0,
    I: 0,
    W: 0,
    E: 0,
    A: 0,
  };
  
  logs.forEach((log) => {
    byLevel[log.level]++;
  });
  
  return {
    total: logs.length,
    filtered: filteredLogs.length,
    byLevel,
  };
}

export const useLogStore = create<LogState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    logs: [],
    filteredLogs: [],
    devices: [],
    selectedDevice: null,
    processes: [],
    selectedProcess: null,
    filter: DEFAULT_FILTER,
    filterPresets: [],
    isPaused: false,
    isConnected: false,
    isLoading: false,
    autoScroll: true,
    settings: DEFAULT_SETTINGS,
    stats: {
      total: 0,
      filtered: 0,
      byLevel: { V: 0, D: 0, I: 0, W: 0, E: 0, A: 0 },
    },
    
    // Actions - Logs
    addLog: (entry) => {
      const { logs, filter, settings, isPaused } = get();
      if (isPaused) return;
      
      const newLogs = [...logs, entry];
      
      // Limit log buffer size
      if (newLogs.length > settings.maxLogLines) {
        newLogs.splice(0, newLogs.length - settings.maxLogLines);
      }
      
      const newFilteredLogs = filterLogs(newLogs, filter);
      const newStats = calculateStats(newLogs, newFilteredLogs);
      
      set({
        logs: newLogs,
        filteredLogs: newFilteredLogs,
        stats: newStats,
      });
    },
    
    addLogs: (entries) => {
      const { logs, filter, settings, isPaused } = get();
      if (isPaused) return;
      
      let newLogs = [...logs, ...entries];
      
      // Limit log buffer size
      if (newLogs.length > settings.maxLogLines) {
        newLogs = newLogs.slice(-settings.maxLogLines);
      }
      
      const newFilteredLogs = filterLogs(newLogs, filter);
      const newStats = calculateStats(newLogs, newFilteredLogs);
      
      set({
        logs: newLogs,
        filteredLogs: newFilteredLogs,
        stats: newStats,
      });
    },
    
    clearLogs: () => {
      set({
        logs: [],
        filteredLogs: [],
        stats: {
          total: 0,
          filtered: 0,
          byLevel: { V: 0, D: 0, I: 0, W: 0, E: 0, A: 0 },
        },
      });
    },
    
    // Actions - Devices
    setDevices: (devices) => set({ devices }),
    
    selectDevice: (device) => {
      set({ selectedDevice: device });
      // Clear logs when switching devices
      get().clearLogs();
    },
    
    // Actions - Processes
    setProcesses: (processes) => set({ processes }),
    
    selectProcess: (process) => {
      set({ selectedProcess: process });
      if (process) {
        get().setFilter({ pid: process.pid });
      } else {
        get().setFilter({ pid: undefined });
      }
    },
    
    // Actions - Filter
    setFilter: (newFilter) => {
      const { logs, filter } = get();
      const updatedFilter = { ...filter, ...newFilter };
      const newFilteredLogs = filterLogs(logs, updatedFilter);
      const newStats = calculateStats(logs, newFilteredLogs);
      
      set({
        filter: updatedFilter,
        filteredLogs: newFilteredLogs,
        stats: newStats,
      });
    },
    
    resetFilter: () => {
      const { logs } = get();
      const newFilteredLogs = filterLogs(logs, DEFAULT_FILTER);
      const newStats = calculateStats(logs, newFilteredLogs);
      
      set({
        filter: DEFAULT_FILTER,
        filteredLogs: newFilteredLogs,
        stats: newStats,
      });
    },
    
    saveFilterPreset: (name) => {
      const { filter, filterPresets } = get();
      const preset: FilterPreset = {
        id: generateId(),
        name,
        config: { ...filter },
        createdAt: Date.now(),
      };
      set({ filterPresets: [...filterPresets, preset] });
    },
    
    loadFilterPreset: (id) => {
      const { filterPresets } = get();
      const preset = filterPresets.find((p) => p.id === id);
      if (preset) {
        get().setFilter(preset.config);
      }
    },
    
    deleteFilterPreset: (id) => {
      const { filterPresets } = get();
      set({ filterPresets: filterPresets.filter((p) => p.id !== id) });
    },
    
    // Actions - UI
    togglePause: () => {
      set((state) => ({ isPaused: !state.isPaused }));
    },
    
    setConnected: (connected) => set({ isConnected: connected }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setAutoScroll: (autoScroll) => set({ autoScroll }),
    
    // Actions - Settings
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));
    },
    
    toggleTheme: () => {
      set((state) => ({
        settings: {
          ...state.settings,
          theme: state.settings.theme === "dark" ? "light" : "dark",
        },
      }));
    },
  }))
);

// Subscribe to theme changes and update document class
useLogStore.subscribe(
  (state) => state.settings.theme,
  (theme) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },
  { fireImmediately: true }
);

