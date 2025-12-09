import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================
// 正则表达式缓存 - 避免重复编译
// ============================================
const regexCache = new Map<string, RegExp>();
const MAX_CACHE_SIZE = 100; // 限制缓存大小，防止内存泄漏

function getCachedRegex(pattern: string, flags: string): RegExp | null {
  const cacheKey = `${pattern}:${flags}`;

  // 检查缓存
  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey)!;
  }

  try {
    const regex = new RegExp(pattern, flags);

    // 如果缓存已满，删除最旧的一个
    if (regexCache.size >= MAX_CACHE_SIZE) {
      const firstKey = regexCache.keys().next().value;
      if (firstKey) {
        regexCache.delete(firstKey);
      }
    }

    regexCache.set(cacheKey, regex);
    return regex;
  } catch {
    return null;
  }
}

// 清除正则缓存（用于测试或内存管理）
export function clearRegexCache() {
  regexCache.clear();
}

// Merge Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format timestamp for display
export function formatTimestamp(timestamp: string): string {
  // If already formatted, return as is
  if (timestamp.includes(":")) {
    return timestamp;
  }
  
  try {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = date.getMilliseconds().toString().padStart(3, "0");
    return `${timeStr}.${ms}`;
  } catch {
    return timestamp;
  }
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// Escape special regex characters
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Create a regex from search text (with caching)
export function createSearchRegex(
  searchText: string,
  isRegex: boolean,
  isCaseSensitive: boolean
): RegExp | null {
  if (!searchText) return null;

  const pattern = isRegex ? searchText : escapeRegex(searchText);
  const flags = isCaseSensitive ? "g" : "gi";
  return getCachedRegex(pattern, flags);
}

// Highlight matching text in a string
export function highlightMatches(
  text: string,
  regex: RegExp | null
): { text: string; isMatch: boolean }[] {
  if (!regex) {
    return [{ text, isMatch: false }];
  }

  const parts: { text: string; isMatch: boolean }[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex state
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isMatch: false });
    }
    parts.push({ text: match[0], isMatch: true });
    lastIndex = regex.lastIndex;

    // Prevent infinite loop for zero-length matches
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false });
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }];
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Parse log line from adb logcat
export function parseLogLine(line: string, id: number): import("../types").LogEntry | null {
  // Format: "MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE"
  // Example: "12-04 10:30:45.123  1234  5678 D MainActivity: onCreate called"
  
  const regex = /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEA])\s+([^:]+):\s*(.*)$/;
  const match = line.match(regex);
  
  if (!match) {
    // Try alternative format without date
    const altRegex = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEA])\s+([^:]+):\s*(.*)$/;
    const altMatch = line.match(altRegex);
    
    if (altMatch) {
      return {
        id,
        timestamp: altMatch[1],
        pid: parseInt(altMatch[2], 10),
        tid: parseInt(altMatch[3], 10),
        level: altMatch[4] as import("../types").LogLevel,
        tag: altMatch[5].trim(),
        message: altMatch[6],
        raw: line,
      };
    }
    
    return null;
  }
  
  return {
    id,
    timestamp: match[1],
    pid: parseInt(match[2], 10),
    tid: parseInt(match[3], 10),
    level: match[4] as import("../types").LogLevel,
    tag: match[5].trim(),
    message: match[6],
    raw: line,
  };
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Match mode: contains, exact, or regex
type MatchMode = "contains" | "exact" | "regex";

// Filter condition with match mode
interface FilterCondition {
  value: string;
  mode: MatchMode;
  exclude: boolean;
}

// A group of conditions joined by OR
interface OrGroup {
  conditions: FilterCondition[];
}

// Android Studio style query parser
export interface ParsedQuery {
  text: string;           // Plain text search
  tagGroups: OrGroup[];   // tag conditions (AND between groups, OR within group)
  packageGroups: OrGroup[];
  messageGroups: OrGroup[];
  minLevel?: string;
  age?: { value: number; unit: string };
  isCrash: boolean;
  isStacktrace: boolean;
}

// Parse a single key-value token
// Supports: key:value (contains), key=:value (exact), key~:value (regex)
function parseKeyValue(token: string): { 
  key: string; 
  value: string; 
  mode: MatchMode;
  exclude: boolean;
} | null {
  const isExclude = token.startsWith("-");
  const cleanToken = isExclude ? token.slice(1) : token;
  
  // Check for regex match syntax (key~:value)
  const regexMatch = cleanToken.match(/^(\w+)~:(.+)$/i);
  if (regexMatch) {
    return { key: regexMatch[1].toLowerCase(), value: regexMatch[2], mode: "regex", exclude: isExclude };
  }
  
  // Check for exact match syntax (key=:value)
  const exactMatch = cleanToken.match(/^(\w+)=:(.+)$/i);
  if (exactMatch) {
    return { key: exactMatch[1].toLowerCase(), value: exactMatch[2], mode: "exact", exclude: isExclude };
  }
  
  // Check for contains match syntax (key:value)
  const containsMatch = cleanToken.match(/^(\w+):(.+)$/i);
  if (containsMatch) {
    return { key: containsMatch[1].toLowerCase(), value: containsMatch[2], mode: "contains", exclude: isExclude };
  }
  
  return null;
}

export function parseLogcatQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    text: "",
    tagGroups: [],
    packageGroups: [],
    messageGroups: [],
    isCrash: false,
    isStacktrace: false,
  };

  if (!query.trim()) {
    return result;
  }

  // Split by | for OR groups, but respect quotes
  const orParts: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "|" && !inQuotes) {
      if (current.trim()) {
        orParts.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    orParts.push(current.trim());
  }

  // If we have OR parts, process each as an OR group
  if (orParts.length > 1) {
    const tagOrConditions: FilterCondition[] = [];
    const packageOrConditions: FilterCondition[] = [];
    const messageOrConditions: FilterCondition[] = [];
    
    for (const part of orParts) {
      const tokens = tokenize(part);
      for (const token of tokens) {
        const parsed = parseKeyValue(token);
        if (parsed) {
          const condition: FilterCondition = { 
            value: parsed.value, 
            mode: parsed.mode, 
            exclude: parsed.exclude 
          };
          
          switch (parsed.key) {
            case "tag":
              tagOrConditions.push(condition);
              break;
            case "package":
              packageOrConditions.push(condition);
              break;
            case "message":
              messageOrConditions.push(condition);
              break;
          }
          processOtherKeys(parsed, result);
        } else if (!token.startsWith("-")) {
          result.text = (result.text + " " + token).trim();
        }
      }
    }
    
    if (tagOrConditions.length > 0) {
      result.tagGroups.push({ conditions: tagOrConditions });
    }
    if (packageOrConditions.length > 0) {
      result.packageGroups.push({ conditions: packageOrConditions });
    }
    if (messageOrConditions.length > 0) {
      result.messageGroups.push({ conditions: messageOrConditions });
    }
  } else {
    // No OR, process as AND (each condition is its own group)
    const tokens = tokenize(query);
    
    for (const token of tokens) {
      const parsed = parseKeyValue(token);
      if (parsed) {
        const condition: FilterCondition = { 
          value: parsed.value, 
          mode: parsed.mode, 
          exclude: parsed.exclude 
        };
        
        switch (parsed.key) {
          case "tag":
            result.tagGroups.push({ conditions: [condition] });
            break;
          case "package":
            result.packageGroups.push({ conditions: [condition] });
            break;
          case "message":
            result.messageGroups.push({ conditions: [condition] });
            break;
        }
        processOtherKeys(parsed, result);
      } else if (!token.startsWith("-")) {
        result.text = (result.text + " " + token).trim();
      }
    }
  }

  return result;
}

// Tokenize a string respecting quotes
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === " " && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
}

// Process non-filter keys
function processOtherKeys(parsed: { key: string; value: string; mode: MatchMode; exclude: boolean }, result: ParsedQuery) {
  switch (parsed.key) {
    case "level":
      const levelValue = parsed.value.toUpperCase();
      if (["VERBOSE", "DEBUG", "INFO", "WARN", "ERROR", "ASSERT", "V", "D", "I", "W", "E", "A"].includes(levelValue)) {
        result.minLevel = levelValue;
      }
      break;
    case "age":
      const match = parsed.value.match(/^(\d+)([smhd])$/i);
      if (match) {
        result.age = {
          value: parseInt(match[1], 10),
          unit: match[2].toLowerCase(),
        };
      }
      break;
    case "is":
      const isValue = parsed.value.toLowerCase();
      if (isValue === "crash") {
        result.isCrash = true;
      } else if (isValue === "stacktrace") {
        result.isStacktrace = true;
      }
      break;
  }
}

// Match a single condition against a value
function matchCondition(value: string, condition: FilterCondition): boolean {
  const v = value.toLowerCase();
  const c = condition.value.toLowerCase();

  let matches = false;

  switch (condition.mode) {
    case "exact":
      matches = v === c;
      break;
    case "regex":
      const regex = getCachedRegex(condition.value, "i");
      if (regex) {
        matches = regex.test(value);
      } else {
        matches = false;
      }
      break;
    case "contains":
    default:
      matches = v.includes(c);
      break;
  }
  
  return condition.exclude ? !matches : matches;
}

// Match an OR group (any condition must match)
function matchOrGroup(value: string, group: OrGroup): boolean {
  if (group.conditions.length === 0) return true;
  
  // Separate include and exclude conditions
  const includes = group.conditions.filter(c => !c.exclude);
  const excludes = group.conditions.filter(c => c.exclude);
  
  // All excludes must pass (AND logic for excludes)
  for (const cond of excludes) {
    if (!matchCondition(value, cond)) {
      return false;
    }
  }
  
  // At least one include must match (OR logic for includes)
  if (includes.length > 0) {
    return includes.some(cond => matchCondition(value, cond));
  }
  
  return true;
}

// Check if log entry matches parsed query
export function matchesQuery(
  entry: import("../types").LogEntry,
  query: ParsedQuery,
  isCaseSensitive: boolean = false
): boolean {
  // Level filter (level:INFO means INFO and above)
  if (query.minLevel) {
    const levelOrder = ["V", "VERBOSE", "D", "DEBUG", "I", "INFO", "W", "WARN", "E", "ERROR", "A", "ASSERT"];
    const entryLevelIndex = levelOrder.indexOf(entry.level);
    const queryLevelIndex = levelOrder.indexOf(query.minLevel);
    
    // Normalize to base level index (0=V, 2=D, 4=I, 6=W, 8=E, 10=A)
    const normalizedEntry = Math.floor(entryLevelIndex / 2) * 2;
    const normalizedQuery = Math.floor(queryLevelIndex / 2) * 2;
    
    if (normalizedEntry < normalizedQuery) {
      return false;
    }
  }

  // Tag filter (all groups must match - AND between groups)
  for (const group of query.tagGroups) {
    if (!matchOrGroup(entry.tag, group)) {
      return false;
    }
  }

  // Package filter
  const packageName = entry.packageName || "";
  for (const group of query.packageGroups) {
    // Handle special "mine" value
    const hasSpecialMine = group.conditions.some(c => c.value.toLowerCase() === "mine" && !c.exclude);
    if (hasSpecialMine) {
      continue; // Skip this group, treat as match
    }
    if (!matchOrGroup(packageName, group)) {
      return false;
    }
  }

  // Message filter
  for (const group of query.messageGroups) {
    if (!matchOrGroup(entry.message, group)) {
      return false;
    }
  }

  // Age filter
  if (query.age && entry.epoch) {
    const now = Date.now();
    let maxAge = 0;
    switch (query.age.unit) {
      case "s": maxAge = query.age.value * 1000; break;
      case "m": maxAge = query.age.value * 60 * 1000; break;
      case "h": maxAge = query.age.value * 60 * 60 * 1000; break;
      case "d": maxAge = query.age.value * 24 * 60 * 60 * 1000; break;
    }
    if (now - entry.epoch > maxAge) {
      return false;
    }
  }

  // Crash filter
  if (query.isCrash) {
    const isCrashLog = 
      entry.message.includes("FATAL EXCEPTION") ||
      entry.message.includes("AndroidRuntime") ||
      entry.tag === "AndroidRuntime" ||
      entry.message.includes("native crash") ||
      entry.message.includes("SIGSEGV") ||
      entry.message.includes("SIGABRT");
    if (!isCrashLog) {
      return false;
    }
  }

  // Stacktrace filter
  if (query.isStacktrace) {
    const isStacktrace =
      entry.message.includes("\tat ") ||
      entry.message.includes("at java.") ||
      entry.message.includes("at android.") ||
      entry.message.includes("at kotlin.") ||
      entry.message.match(/^\s+at\s+[\w.$]+\([\w.]+:\d+\)/);
    if (!isStacktrace) {
      return false;
    }
  }

  // Text search (searches in tag and message)
  if (query.text) {
    const searchTarget = `${entry.tag} ${entry.message}`;
    const searchText = query.text;

    // 根据 isCaseSensitive 决定是否区分大小写
    if (isCaseSensitive) {
      if (!searchTarget.includes(searchText)) {
        return false;
      }
    } else {
      if (!searchTarget.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

// Download text as file
export function downloadAsFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// Import/Export utilities for Android Studio .logcat format
// ============================================

import type { 
  LogEntry, 
  LogLevel, 
  Device,
  AndroidStudioLogcatFile, 
  AndroidStudioLogMessage 
} from "../types";

// Map Android Studio log levels to our format
const AS_LEVEL_MAP: Record<string, LogLevel> = {
  "VERBOSE": "V",
  "DEBUG": "D",
  "INFO": "I",
  "WARN": "W",
  "ERROR": "E",
  "ASSERT": "A",
};

// Map our log levels to Android Studio format
const LEVEL_TO_AS_MAP: Record<LogLevel, "VERBOSE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "ASSERT"> = {
  "V": "VERBOSE",
  "D": "DEBUG",
  "I": "INFO",
  "W": "WARN",
  "E": "ERROR",
  "A": "ASSERT",
};

// Convert Android Studio timestamp to our format
function asTimestampToString(timestamp: { seconds: number; nanos: number }): string {
  const ms = Math.floor(timestamp.nanos / 1000000);
  const date = new Date(timestamp.seconds * 1000 + ms);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const milliseconds = ms.toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// Convert Android Studio log message to our LogEntry format
function asMessageToLogEntry(msg: AndroidStudioLogMessage, index: number): LogEntry {
  const timestamp = asTimestampToString(msg.header.timestamp);
  const epochMs = msg.header.timestamp.seconds * 1000 + Math.floor(msg.header.timestamp.nanos / 1000000);
  
  return {
    id: index,
    timestamp,
    dateTime: new Date(epochMs).toISOString(),
    epoch: epochMs,
    pid: msg.header.pid,
    tid: msg.header.tid,
    level: AS_LEVEL_MAP[msg.header.logLevel] || "D",
    tag: msg.header.tag,
    message: msg.message,
    packageName: msg.header.applicationId,
    processName: msg.header.processName,
  };
}

// Convert our LogEntry to Android Studio log message format
function logEntryToASMessage(entry: LogEntry): AndroidStudioLogMessage {
  // Parse timestamp to get seconds and nanos
  let seconds = 0;
  let nanos = 0;
  
  if (entry.epoch) {
    seconds = Math.floor(entry.epoch / 1000);
    nanos = (entry.epoch % 1000) * 1000000;
  } else if (entry.timestamp) {
    // Try to parse from timestamp string (HH:mm:ss.SSS)
    const now = new Date();
    const parts = entry.timestamp.split(/[:.]/);
    if (parts.length >= 3) {
      now.setHours(parseInt(parts[0], 10) || 0);
      now.setMinutes(parseInt(parts[1], 10) || 0);
      now.setSeconds(parseInt(parts[2], 10) || 0);
      const ms = parseInt(parts[3], 10) || 0;
      seconds = Math.floor(now.getTime() / 1000);
      nanos = ms * 1000000;
    }
  }

  return {
    header: {
      logLevel: LEVEL_TO_AS_MAP[entry.level] || "DEBUG",
      pid: entry.pid,
      tid: entry.tid,
      applicationId: entry.packageName || "",
      processName: entry.processName || "",
      tag: entry.tag,
      timestamp: { seconds, nanos },
    },
    message: entry.message,
  };
}

// Import logs from Android Studio .logcat JSON format
export function importFromAndroidStudioFormat(jsonContent: string): { 
  logs: LogEntry[]; 
  device?: Partial<Device>;
  filter?: string;
} {
  try {
    const data: AndroidStudioLogcatFile = JSON.parse(jsonContent);
    
    const logs = data.logcatMessages.map((msg, index) => 
      asMessageToLogEntry(msg, index)
    );
    
    // Extract device info if available
    let device: Partial<Device> | undefined;
    if (data.metadata?.device?.physicalDevice) {
      const pd = data.metadata.device.physicalDevice;
      device = {
        id: pd.serialNumber,
        name: `${pd.manufacturer} ${pd.model}`,
        model: pd.model,
        state: pd.isOnline ? "device" : "offline",
        isEmulator: false,
      };
    }
    
    return { logs, device, filter: data.metadata?.filter };
  } catch (error) {
    console.error("Failed to parse Android Studio logcat file:", error);
    throw new Error("Invalid Android Studio .logcat file format");
  }
}

// Export logs to Android Studio .logcat JSON format
export function exportToAndroidStudioFormat(
  logs: LogEntry[],
  device?: Device | null,
  filter: string = "",
  projectAppIds: string[] = []
): string {
  const data: AndroidStudioLogcatFile = {
    metadata: {
      device: device ? {
        physicalDevice: {
          serialNumber: device.id,
          isOnline: device.state === "device",
          release: "",
          apiLevel: { majorVersion: 0, minorVersion: 0 },
          featureLevel: 0,
          manufacturer: device.name.split(" ")[0] || "",
          model: device.model,
          type: "HANDHELD",
        },
      } : undefined,
      filter,
      projectApplicationIds: projectAppIds,
    },
    logcatMessages: logs.map(logEntryToASMessage),
  };
  
  return JSON.stringify(data, null, 2);
}

// Try to parse plain text log format
// Format: HH:mm:ss.SSS PID TAG PROCESS LEVEL MESSAGE
export function tryParseTextLogFormat(content: string): LogEntry[] | null {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return null;
  
  const logs: LogEntry[] = [];
  let id = 0;
  
  // Common text log patterns
  // Pattern 1: "16:38:27.552 1868  GreezeManager              system_server               D  message"
  const pattern1 = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\S+)\s+(\S+)\s+([VDIWEA])\s+(.*)$/;
  
  // Pattern 2: "12-04 16:38:27.552  1868  2092 D GreezeManager: message"
  const pattern2 = /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEA])\s+(\S+):\s*(.*)$/;
  
  // Pattern 3: Standard logcat format "D/Tag(PID): message"
  const pattern3 = /^([VDIWEA])\/(\S+)\(\s*(\d+)\):\s*(.*)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    let match: RegExpMatchArray | null;
    
    // Try pattern 1
    match = trimmed.match(pattern1);
    if (match) {
      logs.push({
        id: id++,
        timestamp: match[1],
        pid: parseInt(match[2], 10),
        tid: parseInt(match[2], 10), // TID not available, use PID
        level: match[5] as LogLevel,
        tag: match[3],
        message: match[6],
        processName: match[4],
      });
      continue;
    }
    
    // Try pattern 2
    match = trimmed.match(pattern2);
    if (match) {
      logs.push({
        id: id++,
        timestamp: match[1].split(" ")[1] || match[1],
        pid: parseInt(match[2], 10),
        tid: parseInt(match[3], 10),
        level: match[4] as LogLevel,
        tag: match[5],
        message: match[6],
      });
      continue;
    }
    
    // Try pattern 3
    match = trimmed.match(pattern3);
    if (match) {
      logs.push({
        id: id++,
        timestamp: new Date().toTimeString().slice(0, 12),
        pid: parseInt(match[3], 10),
        tid: parseInt(match[3], 10),
        level: match[1] as LogLevel,
        tag: match[2],
        message: match[4],
      });
      continue;
    }
  }
  
  // If we parsed at least 50% of non-empty lines, consider it successful
  const nonEmptyLines = lines.filter(l => l.trim()).length;
  if (logs.length >= nonEmptyLines * 0.5) {
    return logs;
  }
  
  return null;
}

// Import logs from file content (auto-detect format)
export function importLogs(content: string, filename: string): {
  logs: LogEntry[];
  device?: Partial<Device>;
  format: "logcat" | "text" | "unknown";
} {
  // Try Android Studio .logcat JSON format first
  if (filename.endsWith(".logcat") || content.trim().startsWith("{")) {
    try {
      const result = importFromAndroidStudioFormat(content);
      return { ...result, format: "logcat" };
    } catch {
      // Not a valid JSON, try text format
    }
  }
  
  // Try plain text format
  const textLogs = tryParseTextLogFormat(content);
  if (textLogs && textLogs.length > 0) {
    return { logs: textLogs, format: "text" };
  }
  
  return { logs: [], format: "unknown" };
}

