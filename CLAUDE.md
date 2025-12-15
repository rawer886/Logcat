# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Branch Strategy

- **main** - 受保护的主分支，仅用于正式发布
- **develop** - 开发分支（当前工作分支）
  - 所有日常开发都在此分支进行
  - 通过 Pull Request 合并到 main 分支
  - 发版时创建 tag 并合并到 main

**重要**: 始终在 `develop` 分支上工作，不要直接推送到 `main` 分支。

## Project Overview

Logcat is a high-performance cross-platform Android Logcat viewer built with Tauri 2.0, Rust, and React. It's designed as a lightweight alternative to Android Studio's Logcat with ~10MB install size and support for millions of log entries through virtual scrolling.

## Core Technology Stack (LOCKED - Do not suggest alternatives)

- **Framework**: Tauri 2.0 (NOT Electron)
- **Backend**: Rust
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS (NOT CSS-in-JS)
- **State Management**: Zustand (NOT Redux)
- **Virtual Scrolling**: @tanstack/react-virtual

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (launches Tauri dev server)
npm run dev

# Build TypeScript and Vite bundle
npm run build

# Build Tauri application for release
npm run tauri build

# Run Tauri CLI commands directly
npm run tauri dev
npm run tauri build
```

**Prerequisites**: Node.js 18+, Rust 1.70+, adb (Android Debug Bridge)

## Project Boundaries (STRICT)

### ✅ Allowed Features
- Log viewing, filtering, and export/import
- Features aligned with Android Studio Logcat
- Display settings adjustments

### ❌ Prohibited Features
- Database storage (SQLite, IndexedDB, etc.)
- Network requests (except ADB communication)
- User accounts, login, cloud sync
- Device management beyond log viewing (file transfer, APK installation, etc.)
- Large UI libraries (Ant Design, Material UI, etc.)

### Dependency Policy
Before adding new dependencies:
- Is it truly necessary?
- Package size? (Single package must be <100KB)
- Is there a lighter alternative?

## Architecture

### High-Level Data Flow

```
Android Device → ADB → Rust Backend → Parse → Tauri IPC Event →
React Frontend → Zustand Store → Filter → Virtual List
```

### Frontend Structure (`src/`)

```
components/
├── Toolbar.tsx          # Device selection, filter input
├── LeftToolbar.tsx      # Action buttons (clear, pause, scroll, import/export)
├── LogList.tsx          # Virtual scrolling log list
├── StatusBar.tsx        # Connection status, log statistics
├── FilterBar.tsx        # Filter controls
└── SettingsPanel.tsx    # Display settings

hooks/
├── useLogStream.ts      # Device connection and log streaming via Tauri IPC
├── useFilter.ts         # Filter state management
├── useDeviceMonitor.ts  # Device monitoring and auto-selection
└── useAutoSelectDevice.ts # Auto device selection logic

stores/
└── logStore.ts          # Global Zustand store (ALL state goes here)

lib/
└── utils.ts             # Filter parsing (parseLogcatQuery), import/export

types/
└── index.ts             # LogEntry, Device, FilterConfig, AppSettings, etc.

workers/
└── filter.worker.ts     # Web Worker for filtering large log sets
```

### Backend Structure (`src-tauri/src/`)

```
main.rs                  # Tauri app initialization
commands.rs              # IPC command definitions (get_devices, start_logcat, stop_logcat, etc.)
adb.rs                   # ADB communication, device management, process cache
parser.rs                # Logcat line parsing (threadtime format)
filter.rs                # Optional backend filtering
```

## Core Data Types

```typescript
// The central data structure
interface LogEntry {
  id: number;
  deviceId?: string;
  timestamp: string;
  dateTime?: string;
  epoch?: number;
  pid: number;
  tid: number;
  level: LogLevel;          // "V" | "D" | "I" | "W" | "E" | "A"
  tag: string;
  message: string;
  packageName?: string;
  processName?: string;
  isSystemMarker?: boolean; // For disconnect/reconnect markers
}

interface Device {
  id: string;
  name: string;
  model: string;
  state: "device" | "offline" | "unauthorized" | "no device";
  isEmulator: boolean;
}

interface FilterConfig {
  levels: LogLevel[];
  tags: string[];
  searchText: string;        // Android Studio-style query
  isRegex: boolean;
  isCaseSensitive: boolean;
  packageName?: string;
  pid?: number;
}

interface AppSettings {
  theme: "light" | "dark" | "system";
  fontSize: number;          // Default 12
  lineHeight: number;        // Default 2.0
  maxLogLines: number;       // Default 100000
  autoScroll: boolean;
  showTimestamp: boolean;
  timestampFormat: "datetime" | "time" | "epoch";
  showPid: boolean;
  showTid: boolean;
  showPackageName: boolean;
  showProcessName: boolean;
  showLevel: boolean;
  showTag: boolean;
  hideRepeatedTags: boolean;
  hideRepeatedPackageName: boolean;
  hideRepeatedProcessName: boolean;
  wrapLines: boolean;
}
```

## Key Implementation Patterns

### State Management (Zustand)

```typescript
// Reading state
const { logs, filter, settings } = useLogStore();

// Updating state
const { setFilter, updateSettings, addLogs } = useLogStore();

// Access state outside components
const currentDevices = useLogStore.getState().devices;
```

### Tauri IPC Communication

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Call Rust commands
const devices = await invoke<Device[]>("get_devices");
await invoke("start_logcat", { deviceId });

// Listen to events from Rust
const unlisten = await listen<LogEntry[]>("logcat-entries", (event) => {
  addLogs(event.payload);
});
```

### Rust Command Definition

```rust
#[tauri::command]
pub async fn get_devices() -> Result<Vec<Device>, String> {
    // Implementation
}

// Register in main.rs
.invoke_handler(tauri::generate_handler![
    get_devices,
    start_logcat,
    stop_logcat,
])
```

### Virtual Scrolling

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
  count: filteredLogs.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 28,           // Estimate row height
  overscan: 20,                     // Prerender 20 rows
  measureElement: (el) =>
    el?.getBoundingClientRect().height ?? 28,  // Dynamic height for wrapped lines
});
```

## Filter System (Android Studio Compatible)

### Syntax

```
tag:xxx          # Contains
tag=:xxx         # Exact match
tag~:xxx         # Regex
-tag:xxx         # Exclude
message:xxx      # Message filter
package:xxx      # Package name
level:INFO       # Log level (V/D/I/W/E/A)
age:5m           # Time-based (s/m/h/d)
is:crash         # Special filters
tag:a | tag:b    # OR (pipe)
tag:a tag:b      # AND (space)
```

### Implementation

```typescript
// src/lib/utils.ts
import { parseLogcatQuery, matchesQuery } from "../lib/utils";

const query = parseLogcatQuery("tag:Network -tag:Ads level:WARN");
const filtered = logs.filter(log => matchesQuery(log, query));
```

## Common Tasks

### Adding a New Setting

1. Add field to `AppSettings` interface in `src/types/index.ts`
2. Add default value to `DEFAULT_SETTINGS` in `src/types/index.ts`
3. Add UI control in `src/components/SettingsPanel.tsx`
4. Use `settings.newField` in relevant components

### Adding a New Filter Type

1. Add syntax to `FILTER_SUGGESTIONS` in `src/lib/utils.ts`
2. Update `parseLogcatQuery()` in `src/lib/utils.ts`
3. Update `matchesQuery()` in `src/lib/utils.ts`

### Adding a New IPC Command

1. Define Rust function in `src-tauri/src/commands.rs`:
   ```rust
   #[tauri::command]
   pub async fn my_command(param: String) -> Result<T, String> { ... }
   ```
2. Register in `src-tauri/src/main.rs`:
   ```rust
   .invoke_handler(tauri::generate_handler![..., my_command])
   ```
3. Call from frontend:
   ```typescript
   await invoke("my_command", { param: "value" });
   ```

## Performance Considerations

1. **MUST use virtual scrolling** - Logs can exceed 100k entries
2. **Batch log additions** - Use `addLogs()` not individual `addLog()`
3. **Avoid re-renders** - Use `React.memo`, `useMemo`, `useCallback`
4. **Debounce filtering** - Don't filter on every keystroke
5. **Web Workers** - Use `filter.worker.ts` for heavy filtering

## React Component Guidelines

### Component Structure Order

```typescript
// 1. Imports
import { useState, useCallback, useMemo } from "react";
import { useLogStore } from "../stores/logStore";
import { cn } from "../lib/utils";

// 2. Type definitions
interface Props { ... }

// 3. Component definition
export function Component({ prop }: Props) {
  // 3.1 Zustand store
  const { logs, settings } = useLogStore();

  // 3.2 Local state
  const [state, setState] = useState(false);

  // 3.3 Derived state (useMemo)
  const derived = useMemo(() => process(logs), [logs]);

  // 3.4 Callbacks (useCallback)
  const handleClick = useCallback(() => { ... }, []);

  // 3.5 Effects (useEffect)
  useEffect(() => { ... }, []);

  // 3.6 Render
  return <div className={cn("...", condition && "...")}>{...}</div>;
}
```

### Styling

- Use Tailwind CSS classes exclusively
- Use `cn()` utility for conditional classes
- NO inline `style` prop
- Components rendering list items MUST use `React.memo`

### Constraints

- Components should not exceed 300 lines
- No component definitions inside components
- Max 5 levels of nesting
- Don't create objects/functions during render

## Rust Backend Guidelines

### Error Handling

```rust
// ✅ Use Result and ? operator
fn process() -> Result<T, String> {
    let value = fallible_op().map_err(|e| e.to_string())?;
    Ok(value)
}

// ❌ Avoid unwrap() in production
let value = option.unwrap();  // Don't do this
```

### Sending Events to Frontend

```rust
use tauri::Emitter;

// Send log batch
app_handle.emit("logcat-entries", &log_batch)?;
```

### ADB Communication

```rust
use tokio::process::Command;

let output = Command::new("adb")
    .args(["-s", device_id, "logcat", "-v", "threadtime"])
    .output()
    .await?;
```

## File Locations Reference

| Task | File |
|------|------|
| All state operations | `src/stores/logStore.ts` |
| Filter parsing & matching | `src/lib/utils.ts` |
| Device connection & log streaming | `src/hooks/useLogStream.ts` |
| Virtual scrolling log list | `src/components/LogList.tsx` |
| IPC command definitions | `src-tauri/src/commands.rs` |
| ADB communication | `src-tauri/src/adb.rs` |
| Log line parsing | `src-tauri/src/parser.rs` |

## Response Style (IMPORTANT)

- **Use Chinese (中文) for all responses** to the user
- Reference Android Studio Logcat for feature inspiration
- Keep solutions simple, avoid over-engineering
- Prioritize performance for large log volumes
- Follow project boundaries strictly - don't suggest databases, networking, etc.

## Commit Message Format

```
类型: 简短描述

类型: feat/fix/refactor/style/docs/perf
使用中文
```
