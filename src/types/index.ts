// Log level enum matching Android's log levels
export type LogLevel = "V" | "D" | "I" | "W" | "E" | "A";

// Single log entry structure
export interface LogEntry {
  id: number;
  timestamp: string;
  pid: number;
  tid: number;
  level: LogLevel;
  tag: string;
  message: string;
  raw?: string;
}

// Connected Android device
export interface Device {
  id: string;
  name: string;
  model: string;
  state: "device" | "offline" | "unauthorized" | "no device";
  isEmulator: boolean;
}

// Process info
export interface ProcessInfo {
  pid: number;
  name: string;
  packageName?: string;
}

// Filter configuration
export interface FilterConfig {
  id?: string;
  name?: string;
  levels: LogLevel[];
  tags: string[];
  packageName?: string;
  pid?: number;
  searchText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
}

// Saved filter preset
export interface FilterPreset {
  id: string;
  name: string;
  config: FilterConfig;
  createdAt: number;
}

// Application settings
export interface AppSettings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  lineHeight: number;
  maxLogLines: number;
  autoScroll: boolean;
  showTimestamp: boolean;
  showPid: boolean;
  showTid: boolean;
  showLevel: boolean;
  showTag: boolean;
  wrapLines: boolean;
}

// Log statistics
export interface LogStats {
  total: number;
  filtered: number;
  byLevel: Record<LogLevel, number>;
}

// Export format options
export type ExportFormat = "txt" | "json" | "csv";

// IPC Events from Rust backend
export interface LogEvent {
  type: "log";
  entry: LogEntry;
}

export interface DeviceEvent {
  type: "device_connected" | "device_disconnected";
  device: Device;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type BackendEvent = LogEvent | DeviceEvent | ErrorEvent;

// Column configuration for log table
export interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  visible: boolean;
  resizable: boolean;
}

// Default column configurations
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "timestamp", label: "时间", width: 100, minWidth: 80, visible: true, resizable: true },
  { id: "pid", label: "PID", width: 60, minWidth: 50, visible: true, resizable: true },
  { id: "tid", label: "TID", width: 60, minWidth: 50, visible: true, resizable: true },
  { id: "level", label: "级别", width: 50, minWidth: 40, visible: true, resizable: false },
  { id: "tag", label: "TAG", width: 150, minWidth: 80, visible: true, resizable: true },
  { id: "message", label: "消息", width: -1, minWidth: 200, visible: true, resizable: false },
];

// Default filter configuration
export const DEFAULT_FILTER: FilterConfig = {
  levels: ["V", "D", "I", "W", "E", "A"],
  tags: [],
  searchText: "",
  isRegex: false,
  isCaseSensitive: false,
};

// Default application settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  fontSize: 12,
  lineHeight: 1.5,
  maxLogLines: 100000,
  autoScroll: true,
  showTimestamp: true,
  showPid: true,
  showTid: true,
  showLevel: true,
  showTag: true,
  wrapLines: false,
};

// Log level display info
export const LOG_LEVEL_INFO: Record<LogLevel, { label: string; color: string; bgColor: string }> = {
  V: { label: "Verbose", color: "#9E9E9E", bgColor: "transparent" },
  D: { label: "Debug", color: "#2196F3", bgColor: "transparent" },
  I: { label: "Info", color: "#4CAF50", bgColor: "transparent" },
  W: { label: "Warn", color: "#FFC107", bgColor: "rgba(255, 193, 7, 0.1)" },
  E: { label: "Error", color: "#F44336", bgColor: "rgba(244, 67, 54, 0.1)" },
  A: { label: "Assert", color: "#9C27B0", bgColor: "rgba(156, 39, 176, 0.1)" },
};

