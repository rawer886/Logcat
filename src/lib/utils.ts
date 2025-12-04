import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

// Create a regex from search text
export function createSearchRegex(
  searchText: string,
  isRegex: boolean,
  isCaseSensitive: boolean
): RegExp | null {
  if (!searchText) return null;
  
  try {
    const pattern = isRegex ? searchText : escapeRegex(searchText);
    const flags = isCaseSensitive ? "g" : "gi";
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
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

