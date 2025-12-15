import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  LogEntry,
  Device,
  DeviceLogCollection,
  ProcessInfo,
  FilterConfig,
  FilterPreset,
  FilterHistoryItem,
  AppSettings,
  LogStats,
  LogLevel,
} from "../types";
import {
  DEFAULT_FILTER,
  DEFAULT_SETTINGS,
} from "../types";
import { createSearchRegex, generateId, parseLogcatQuery, matchesQuery } from "../lib/utils";

interface LogState {
  // Logs - 多设备日志存储
  deviceLogs: Map<string, DeviceLogCollection>;  // 每个设备的日志集合
  currentLogs: LogEntry[];  // 当前显示的日志（当前设备或导入的）
  filteredLogs: LogEntry[];

  // Devices
  devices: Device[];
  selectedDevice: Device | null;
  lastSelectedDeviceId: string | null;  // 记录上次选中的设备

  // Imported file
  importedFileName: string | null;

  // Processes
  processes: ProcessInfo[];
  selectedProcess: ProcessInfo | null;

  // Filter
  filter: FilterConfig;
  filterPresets: FilterPreset[];
  filterHistory: FilterHistoryItem[];

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
  addLogsForDevice: (deviceId: string, entries: LogEntry[]) => void;  // 新增：为设备添加日志
  clearLogs: () => void;
  importLogs: (entries: LogEntry[], fileName?: string) => void;
  clearImportedFile: () => void;

  // Actions - Devices
  setDevices: (devices: Device[]) => void;
  selectDevice: (device: Device | null) => void;
  switchToDevice: (deviceId: string) => void;  // 新增：切换到设备
  addDeviceMarker: (deviceId: string, message: string, type: 'disconnect' | 'reconnect') => void;  // 新增：添加设备标注
  
  // Actions - Processes
  setProcesses: (processes: ProcessInfo[]) => void;
  selectProcess: (process: ProcessInfo | null) => void;
  
  // Actions - Filter
  setFilter: (filter: Partial<FilterConfig>) => void;
  resetFilter: () => void;
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (id: string) => void;
  deleteFilterPreset: (id: string) => void;
  
  // Actions - Filter History
  addFilterHistory: (query: string) => void;
  toggleFilterFavorite: (id: string) => void;
  deleteFilterHistory: (id: string) => void;
  clearFilterHistory: () => void;
  
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
  // Parse the search text as Android Studio style query
  const parsedQuery = parseLogcatQuery(filter.searchText);
  
  // Create regex for plain text search if using regex mode
  const regex = filter.isRegex && parsedQuery.text
    ? createSearchRegex(parsedQuery.text, true, filter.isCaseSensitive)
    : null;
  
  return logs.filter((log) => {
    // Use the parsed query matcher
    if (!matchesQuery(log, parsedQuery, filter.isCaseSensitive)) {
      return false;
    }
    
    // Additional regex matching for regex mode
    if (regex) {
      const searchTarget = `${log.tag} ${log.message}`;
      if (!regex.test(searchTarget)) {
        return false;
      }
    }
    
    // Filter by PID (from process selector, not query)
    if (filter.pid !== undefined && log.pid !== filter.pid) {
      return false;
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
    deviceLogs: new Map<string, DeviceLogCollection>(),  // 多设备日志存储
    currentLogs: [],  // 当前显示的日志
    filteredLogs: [],
    devices: [],
    selectedDevice: null,
    lastSelectedDeviceId: null,  // 记录上次选中的设备
    importedFileName: null,
    processes: [],
    selectedProcess: null,
    filter: DEFAULT_FILTER,
    filterPresets: [],
    filterHistory: [],
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
      get().addLogs([entry]);
    },
    
    addLogs: (entries) => {
      const { currentLogs, filteredLogs, filter, settings, isPaused, stats } = get();
      if (isPaused || entries.length === 0) return;

      let mergedLogs = [...currentLogs, ...entries];
      let removedLogs: LogEntry[] = [];
      
      if (mergedLogs.length > settings.maxLogLines) {
        const excess = mergedLogs.length - settings.maxLogLines;
        removedLogs = mergedLogs.slice(0, excess);
        mergedLogs = mergedLogs.slice(excess);
      }
      
      const removedIds = removedLogs.length > 0
        ? new Set(removedLogs.map((entry) => entry.id))
        : null;
      
      const preservedFiltered = removedIds
        ? filteredLogs.filter((entry) => !removedIds.has(entry.id))
        : filteredLogs;
      
      const appendedFiltered = filterLogs(entries, filter);
      const newFilteredLogs = appendedFiltered.length > 0
        ? [...preservedFiltered, ...appendedFiltered]
        : preservedFiltered !== filteredLogs
          ? preservedFiltered
          : filteredLogs;
      
      // 增量更新统计信息
      const nextByLevel: Record<LogLevel, number> = { ...stats.byLevel };
      for (const entry of entries) {
        nextByLevel[entry.level] = (nextByLevel[entry.level] ?? 0) + 1;
      }
      for (const entry of removedLogs) {
        nextByLevel[entry.level] = Math.max(
          0,
          (nextByLevel[entry.level] ?? 0) - 1
        );
      }

      const newStats: LogStats = {
        total: stats.total + entries.length - removedLogs.length,
        filtered: newFilteredLogs.length,
        byLevel: nextByLevel,
      };
      
      set({
        currentLogs: mergedLogs,
        filteredLogs: newFilteredLogs,
        stats: newStats,
      });
    },
    
    // 新增：为设备添加日志
    addLogsForDevice: (deviceId, entries) => {
      const { deviceLogs, selectedDevice, settings, filter, isPaused } = get();
      if (isPaused || entries.length === 0) return;

      // 为日志条目添加 deviceId
      const entriesWithDevice = entries.map(e => ({ ...e, deviceId }));

      // 获取或创建设备日志集合
      let collection = deviceLogs.get(deviceId);
      if (!collection) {
        const device = get().devices.find(d => d.id === deviceId);
        collection = {
          deviceId,
          deviceName: device?.name || deviceId,
          logs: [],
          lastActiveTime: Date.now(),
        };
      }

      // 添加日志并应用独立的 maxLogLines 限制
      let mergedLogs = [...collection.logs, ...entriesWithDevice];
      if (mergedLogs.length > settings.maxLogLines) {
        mergedLogs = mergedLogs.slice(mergedLogs.length - settings.maxLogLines);
      }

      collection.logs = mergedLogs;
      collection.lastActiveTime = Date.now();

      // 更新 Map
      const newDeviceLogs = new Map(deviceLogs);
      newDeviceLogs.set(deviceId, collection);

      // 如果是当前选中设备，更新 currentLogs 和 filteredLogs
      let updates: any = { deviceLogs: newDeviceLogs };
      if (selectedDevice?.id === deviceId) {
        updates.currentLogs = mergedLogs;
        updates.filteredLogs = filterLogs(mergedLogs, filter);
        updates.stats = calculateStats(mergedLogs, updates.filteredLogs);
      }

      set(updates);
    },

    clearLogs: () => {
      set({
        currentLogs: [],
        filteredLogs: [],
        stats: {
          total: 0,
          filtered: 0,
          byLevel: { V: 0, D: 0, I: 0, W: 0, E: 0, A: 0 },
        },
      });
    },

    importLogs: (entries, fileName) => {
      const { filter } = get();

      // 导入的日志没有 deviceId，不添加到 deviceLogs
      const newFilteredLogs = filterLogs(entries, filter);
      const newStats = calculateStats(entries, newFilteredLogs);

      set({
        currentLogs: entries,
        filteredLogs: newFilteredLogs,
        stats: newStats,
        isPaused: true, // Pause when importing logs
        importedFileName: fileName || null,
        selectedDevice: null, // Clear device when importing file
      });
    },
    
    clearImportedFile: () => {
      set({ importedFileName: null });
    },
    
    // Actions - Devices
    setDevices: (devices) => set({ devices }),
    
    selectDevice: (device) => {
      set({
        selectedDevice: device,
        importedFileName: null, // Clear imported file when selecting device
      });
    },

    // 新增：切换到设备
    switchToDevice: (deviceId) => {
      const { deviceLogs, filter, devices } = get();

      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      // 获取设备日志
      const collection = deviceLogs.get(deviceId);
      const logs = collection?.logs || [];
      const filteredLogs = filterLogs(logs, filter);
      const stats = calculateStats(logs, filteredLogs);

      set({
        selectedDevice: device,
        currentLogs: logs,
        filteredLogs,
        stats,
        lastSelectedDeviceId: deviceId,
        importedFileName: null,
      });
    },

    // 新增：添加设备标注
    addDeviceMarker: (deviceId, message, type) => {
      const markerEntry: LogEntry = {
        id: Date.now(),
        deviceId,
        timestamp: new Date().toLocaleTimeString(),
        pid: 0,
        tid: 0,
        level: 'I',
        tag: 'System',
        message,
        isSystemMarker: true,
      };

      get().addLogsForDevice(deviceId, [markerEntry]);
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
      const { currentLogs, filter } = get();
      const updatedFilter = { ...filter, ...newFilter };
      const newFilteredLogs = filterLogs(currentLogs, updatedFilter);
      const newStats = calculateStats(currentLogs, newFilteredLogs);

      set({
        filter: updatedFilter,
        filteredLogs: newFilteredLogs,
        stats: newStats,
      });
    },

    resetFilter: () => {
      const { currentLogs } = get();
      const newFilteredLogs = filterLogs(currentLogs, DEFAULT_FILTER);
      const newStats = calculateStats(currentLogs, newFilteredLogs);

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
    
    // Actions - Filter History
    addFilterHistory: (query) => {
      if (!query.trim()) return;
      
      const { filterHistory } = get();
      
      // Check if already exists
      const existing = filterHistory.find((h) => h.query === query);
      if (existing) {
        // Update timestamp and move to top (but keep favorite status)
        const updated = filterHistory.map((h) =>
          h.id === existing.id ? { ...h, timestamp: Date.now() } : h
        );
        set({ filterHistory: updated });
        return;
      }
      
      // Add new history item
      const newItem: FilterHistoryItem = {
        id: generateId(),
        query,
        timestamp: Date.now(),
        isFavorite: false,
      };
      
      // Get favorites and non-favorites
      const favorites = filterHistory.filter((h) => h.isFavorite);
      const nonFavorites = filterHistory.filter((h) => !h.isFavorite);
      
      // Limit non-favorites to 20
      const limitedNonFavorites = [newItem, ...nonFavorites].slice(0, 20);
      
      set({ filterHistory: [...favorites, ...limitedNonFavorites] });
    },
    
    toggleFilterFavorite: (id) => {
      const { filterHistory } = get();
      const updated = filterHistory.map((h) =>
        h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
      );
      set({ filterHistory: updated });
    },
    
    deleteFilterHistory: (id) => {
      const { filterHistory } = get();
      set({ filterHistory: filterHistory.filter((h) => h.id !== id) });
    },
    
    clearFilterHistory: () => {
      const { filterHistory } = get();
      // Keep only favorites
      set({ filterHistory: filterHistory.filter((h) => h.isFavorite) });
    },
    
    // Actions - UI
    togglePause: () => {
      set((state) => ({ isPaused: !state.isPaused }));
    },
    
    setConnected: (connected) => set({ isConnected: connected }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setAutoScroll: (autoScroll) =>
      set((state) =>
        state.autoScroll === autoScroll ? state : { autoScroll }
      ),
    
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

