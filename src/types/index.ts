// Log level enum matching Android's log levels
export type LogLevel = "V" | "D" | "I" | "W" | "E" | "A";

// Timestamp format options
export type TimestampFormat = "datetime" | "time" | "epoch";

// Single log entry structure
export interface LogEntry {
  id: number;
  timestamp: string;
  dateTime?: string;  // Full date-time string
  epoch?: number;     // Unix timestamp
  pid: number;
  tid: number;
  level: LogLevel;
  tag: string;
  message: string;
  packageName?: string;
  processName?: string;
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

// Filter history item
export interface FilterHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  isFavorite: boolean;
}

// Application settings
export interface AppSettings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  lineHeight: number;
  maxLogLines: number;
  autoScroll: boolean;
  // Timestamp settings
  showTimestamp: boolean;
  timestampFormat: TimestampFormat;
  // Process settings
  showPid: boolean;
  showTid: boolean;  // Show TID in same column as PID
  // Package/Process name settings
  showPackageName: boolean;
  showProcessName: boolean;
  hideRepeatedPackageName: boolean;
  hideRepeatedProcessName: boolean;
  // Other columns
  showLevel: boolean;
  showTag: boolean;
  hideRepeatedTags: boolean;  // Hide repeated TAG values
  wrapLines: boolean;
}

// Log statistics
export interface LogStats {
  total: number;
  filtered: number;
  byLevel: Record<LogLevel, number>;
}

// Export format options
export type ExportFormat = "txt" | "json" | "csv" | "logcat";

// Android Studio .logcat file format
export interface AndroidStudioLogcatFile {
  metadata: {
    device?: {
      physicalDevice?: {
        serialNumber: string;
        isOnline: boolean;
        release: string;
        apiLevel: { majorVersion: number; minorVersion: number };
        featureLevel: number;
        manufacturer: string;
        model: string;
        type: string;
      };
    };
    filter: string;
    projectApplicationIds: string[];
  };
  logcatMessages: AndroidStudioLogMessage[];
}

export interface AndroidStudioLogMessage {
  header: {
    logLevel: "VERBOSE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "ASSERT";
    pid: number;
    tid: number;
    applicationId: string;
    processName: string;
    tag: string;
    timestamp: {
      seconds: number;
      nanos: number;
    };
  };
  message: string;
}

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
  // Timestamp
  showTimestamp: true,
  timestampFormat: "time",
  // Process
  showPid: true,
  showTid: false,  // TID hidden by default
  // Package/Process name
  showPackageName: true,
  showProcessName: false,
  hideRepeatedPackageName: false,
  hideRepeatedProcessName: false,
  // Other columns
  showLevel: true,
  showTag: true,
  hideRepeatedTags: false,
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

