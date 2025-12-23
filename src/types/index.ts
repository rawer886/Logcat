// Log level enum matching Android's log levels
export type LogLevel = "V" | "D" | "I" | "W" | "E" | "A";

// Timestamp format options
export type TimestampFormat = "datetime" | "time" | "epoch";

// Single log entry structure
export interface LogEntry {
  id: number;
  deviceId?: string;  // 新增：设备ID，用于多设备日志分离
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
  isSystemMarker?: boolean;  // 新增：标记系统消息（断开/重连）
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

// 新增：每个设备的日志集合
export interface DeviceLogCollection {
  deviceId: string;
  deviceName: string;
  logs: LogEntry[];
  lastActiveTime: number;
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

// Font family options
export type FontFamily = "system" | "jetbrains-mono" | "fira-code" | "source-code-pro" | "consolas" | "menlo";

// Application settings
export interface AppSettings {
  theme: "light" | "dark" | "system";
  fontFamily: FontFamily;
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
  showRepeatedPackageName: boolean;
  showRepeatedProcessName: boolean;
  // Other columns
  showLevel: boolean;
  showTag: boolean;
  showRepeatedTags: boolean;  // Show repeated TAG values
  wrapLines: boolean;
  // Column width settings (in characters)
  tagColumnWidth: number;
  packageColumnWidth: number;
  processColumnWidth: number;
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

// Font family mapping
export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  "system": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  "jetbrains-mono": "'JetBrains Mono', monospace",
  "fira-code": "'Fira Code', monospace",
  "source-code-pro": "'Source Code Pro', monospace",
  "consolas": "Consolas, monospace",
  "menlo": "Menlo, Monaco, monospace",
};

// Default application settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  fontFamily: "system",
  fontSize: 12,
  lineHeight: 1.2,
  maxLogLines: 100000,
  autoScroll: true,
  // Timestamp - 默认显示日期+时间
  showTimestamp: true,
  timestampFormat: "datetime",
  // Process - 默认显示 PID 和 TID
  showPid: true,
  showTid: true,
  // Package/Process name - 包名默认显示，进程名默认不显示
  showPackageName: true,
  showProcessName: false,
  showRepeatedPackageName: true,
  showRepeatedProcessName: true,
  // Other columns - TAG 和 Level 默认显示
  showLevel: true,
  showTag: true,
  showRepeatedTags: true,
  wrapLines: false,
  // Column widths (in characters) - matching Android Studio defaults
  tagColumnWidth: 23,
  packageColumnWidth: 35,
  processColumnWidth: 35,
};

// Log level display info - uses CSS variables for theme support
export const LOG_LEVEL_INFO: Record<LogLevel, { label: string; color: string; bgColor: string }> = {
  V: { label: "Verbose", color: "var(--log-verbose)", bgColor: "var(--log-verbose-bg)" },
  D: { label: "Debug", color: "var(--log-debug)", bgColor: "var(--log-debug-bg)" },
  I: { label: "Info", color: "var(--log-info)", bgColor: "var(--log-info-bg)" },
  W: { label: "Warn", color: "var(--log-warn)", bgColor: "var(--log-warn-bg)" },
  E: { label: "Error", color: "var(--log-error)", bgColor: "var(--log-error-bg)" },
  A: { label: "Assert", color: "var(--log-assert)", bgColor: "var(--log-assert-bg)" },
};

