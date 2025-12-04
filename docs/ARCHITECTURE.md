# 架构文档

本文档描述 Logcat 的技术架构、模块设计和数据流。

---

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Logcat Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Frontend (React)                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │ │
│  │  │ Toolbar  │ │ LogList  │ │LeftBar   │ │SettingsPanel│   │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │ │
│  │       │            │            │              │            │ │
│  │  ┌────┴────────────┴────────────┴──────────────┴────────┐  │ │
│  │  │                   Zustand Store                       │  │ │
│  │  │  (logs, devices, filter, settings, history)          │  │ │
│  │  └──────────────────────┬────────────────────────────────┘  │ │
│  │                         │                                   │ │
│  │  ┌──────────────────────┴────────────────────────────────┐  │ │
│  │  │                 Custom Hooks                          │  │ │
│  │  │  useLogStream, useFilter                              │  │ │
│  │  └──────────────────────┬────────────────────────────────┘  │ │
│  └─────────────────────────┼────────────────────────────────────┘ │
│                            │ IPC (Tauri Commands)                │
│  ┌─────────────────────────┼────────────────────────────────────┐ │
│  │                     Backend (Rust)                           │ │
│  │  ┌──────────────────────┴────────────────────────────────┐  │ │
│  │  │                   commands.rs                          │  │ │
│  │  │  get_devices, start_logcat, stop_logcat, clear_logcat │  │ │
│  │  └──────────┬─────────────────────────────┬──────────────┘  │ │
│  │             │                             │                  │ │
│  │  ┌──────────┴──────────┐    ┌────────────┴────────────┐    │ │
│  │  │       adb.rs        │    │       parser.rs         │    │ │
│  │  │  ADB Process Mgmt   │    │   Log Line Parsing      │    │ │
│  │  │  Device Detection   │    │   Process Name Cache    │    │ │
│  │  └──────────┬──────────┘    └─────────────────────────┘    │ │
│  └─────────────┼────────────────────────────────────────────────┘ │
└────────────────┼────────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │   ADB Server    │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───┴───┐  ┌────┴────┐  ┌────┴────┐
│Device │  │ Device  │  │Emulator │
└───────┘  └─────────┘  └─────────┘
```

### 1.2 技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| **桌面框架** | Tauri 2.0 | 包体积小(~10MB vs Electron ~150MB)，性能好 |
| **后端语言** | Rust | 内存安全，高性能，天然适合处理 ADB 进程 |
| **前端框架** | React 18 | 生态成熟，组件化开发 |
| **类型系统** | TypeScript | 类型安全，开发体验好 |
| **样式方案** | Tailwind CSS | 原子化 CSS，快速开发 |
| **状态管理** | Zustand | 轻量(~1KB)，API 简洁 |
| **虚拟列表** | @tanstack/react-virtual | 高性能，支持动态行高 |

---

## 2. 模块设计

### 2.1 前端模块

```
src/
├── components/           # UI 组件
│   ├── Toolbar.tsx      # 顶部工具栏（设备选择、过滤器输入）
│   ├── LeftToolbar.tsx  # 左侧工具栏（操作按钮）
│   ├── LogList.tsx      # 日志列表（虚拟滚动）
│   ├── StatusBar.tsx    # 底部状态栏（统计信息）
│   └── SettingsPanel.tsx # 设置面板
│
├── hooks/               # 自定义 Hooks
│   ├── useLogStream.ts  # 日志流管理（连接、启停）
│   └── useFilter.ts     # 过滤器状态管理
│
├── stores/              # 状态管理
│   └── logStore.ts      # 全局状态（Zustand）
│
├── lib/                 # 工具库
│   └── utils.ts         # 过滤器解析、导入导出、辅助函数
│
└── types/               # 类型定义
    └── index.ts         # LogEntry, Device, Settings 等
```

### 2.2 后端模块

```
src-tauri/src/
├── main.rs              # Tauri 入口，应用初始化
├── commands.rs          # IPC 命令定义（前后端通信接口）
├── adb.rs               # ADB 通信模块
│   ├── get_devices()    # 获取设备列表
│   ├── start_logcat()   # 启动日志流
│   ├── stop_logcat()    # 停止日志流
│   └── ProcessCache     # 进程名缓存
│
├── parser.rs            # 日志解析模块
│   ├── parse_logcat_line() # 解析单行日志
│   └── LogEntry struct  # 日志条目结构
│
└── filter.rs            # 过滤引擎（后端过滤，可选）
```

### 2.3 组件职责

| 组件 | 职责 | 依赖 |
|------|------|------|
| `Toolbar` | 设备选择、过滤器输入、自动补全 | useLogStream, useFilter |
| `LeftToolbar` | 操作按钮（清空、暂停、滚动、导入导出）| logStore |
| `LogList` | 日志渲染、虚拟滚动、列宽调整 | logStore, react-virtual |
| `StatusBar` | 连接状态、日志统计 | logStore |
| `SettingsPanel` | 显示设置配置 | logStore |

---

## 3. 数据流

### 3.1 日志流数据流

```
┌─────────┐    ADB     ┌─────────┐   Parse   ┌─────────┐
│ Device  │ ────────▶  │  Rust   │ ────────▶ │LogEntry │
│ logcat  │            │ Backend │           │ struct  │
└─────────┘            └────┬────┘           └────┬────┘
                            │                     │
                       IPC Event                  │
                            │                     │
                            ▼                     ▼
                       ┌─────────┐          ┌─────────┐
                       │ Frontend│ ◀─────── │  Store  │
                       │  Event  │   emit   │  logs[] │
                       │ Handler │          └────┬────┘
                       └─────────┘               │
                                                 │ filter
                                                 ▼
                                          ┌─────────────┐
                                          │filteredLogs │
                                          └──────┬──────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  LogList    │
                                          │ (Virtual)   │
                                          └─────────────┘
```

### 3.2 过滤器数据流

```
User Input          Parse            Match              Render
    │                 │                │                  │
    ▼                 ▼                ▼                  ▼
┌────────┐      ┌──────────┐     ┌──────────┐      ┌──────────┐
│"tag:A" │ ───▶ │ParsedQuery│ ───▶│matchesQuery│ ───▶│filteredLogs│
│        │      │{tags:[A]}│     │  (filter)  │      │  (array)  │
└────────┘      └──────────┘     └──────────┘      └──────────┘
```

### 3.3 状态结构

```typescript
interface LogState {
  // 核心数据
  logs: LogEntry[];           // 原始日志
  filteredLogs: LogEntry[];   // 过滤后的日志
  
  // 设备
  devices: Device[];          // 设备列表
  selectedDevice: Device;     // 当前设备
  importedFileName: string;   // 导入的文件名
  
  // 过滤
  filter: FilterConfig;       // 当前过滤配置
  filterHistory: FilterHistoryItem[]; // 过滤历史
  
  // UI 状态
  isPaused: boolean;          // 是否暂停
  isConnected: boolean;       // 是否已连接
  autoScroll: boolean;        // 自动滚动
  
  // 设置
  settings: AppSettings;      // 应用设置
  
  // 统计
  stats: LogStats;            // 日志统计
}
```

---

## 4. 关键实现

### 4.1 虚拟滚动

使用 `@tanstack/react-virtual` 实现高性能列表渲染：

```typescript
const virtualizer = useVirtualizer({
  count: filteredLogs.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 28,           // 预估行高
  overscan: 20,                     // 预渲染行数
  measureElement: (element) => {    // 动态测量（换行时）
    return element?.getBoundingClientRect().height ?? 28;
  },
});
```

关键优化：
- 只渲染可见区域 + overscan
- 支持动态行高（自动换行）
- 使用 `measureElement` 精确测量

### 4.2 过滤器解析

实现 Android Studio 兼容的查询语法解析：

```typescript
// 输入: "tag:Main | message:error -tag:Ads level:INFO"
// 输出:
{
  tagGroups: [
    { conditions: [{ value: "Main", mode: "contains", exclude: false }] }
  ],
  messageGroups: [
    { conditions: [{ value: "error", mode: "contains", exclude: false }] }
  ],
  // ... 排除条件、级别等
}
```

支持的语法：
- `key:value` - 包含匹配
- `key=:value` - 精确匹配
- `key~:value` - 正则匹配
- `-key:value` - 排除
- `|` - OR 组合

### 4.3 ADB 通信

Rust 后端通过 `std::process::Command` 与 ADB 通信：

```rust
// 启动 logcat 进程
let child = Command::new("adb")
    .args(["-s", device_id, "logcat", "-v", "threadtime"])
    .stdout(Stdio::piped())
    .spawn()?;

// 逐行读取并解析
for line in reader.lines() {
    let entry = parse_logcat_line(&line)?;
    // 通过 Tauri Event 发送到前端
    app_handle.emit("log-entry", entry)?;
}
```

### 4.4 进程名缓存

后端维护 PID → 进程名的缓存，定期刷新：

```rust
struct ProcessCache {
    cache: HashMap<u32, ProcessInfo>,
    last_update: Instant,
}

impl ProcessCache {
    fn refresh(&mut self, device_id: &str) {
        // 执行 adb shell ps -A -o PID,NAME
        // 解析并更新缓存
    }
    
    fn get(&self, pid: u32) -> Option<&ProcessInfo> {
        self.cache.get(&pid)
    }
}
```

---

## 5. 性能考虑

### 5.1 性能指标

| 指标 | 目标 | 实现方式 |
|------|------|----------|
| 启动时间 | < 2s | Tauri 轻量化 |
| 渲染 FPS | ≥ 60 | 虚拟滚动 |
| 10万日志内存 | < 300MB | 日志缓冲限制 |
| 过滤延迟 | < 100ms | 前端过滤 + 防抖 |

### 5.2 优化策略

1. **虚拟滚动** - 只渲染可见行
2. **日志缓冲限制** - 默认最多 10 万条
3. **React.memo** - 避免不必要的重渲染
4. **useMemo/useCallback** - 缓存计算结果和回调
5. **防抖过滤** - 输入时延迟过滤

---

## 6. 扩展性设计

### 6.1 添加新的过滤器类型

1. 在 `utils.ts` 的 `FILTER_SUGGESTIONS` 添加语法提示
2. 在 `parseLogcatQuery` 添加解析逻辑
3. 在 `matchesQuery` 添加匹配逻辑

### 6.2 添加新的 IPC 命令

1. 在 `commands.rs` 定义 Rust 函数
2. 在 `main.rs` 注册命令
3. 在前端通过 `invoke` 调用

### 6.3 添加新的设置项

1. 在 `types/index.ts` 的 `AppSettings` 添加字段
2. 在 `DEFAULT_SETTINGS` 添加默认值
3. 在 `SettingsPanel` 添加 UI
4. 在相关组件中读取并应用设置

---

## 7. 安全考虑

- **无网络请求** - 除 ADB 外不进行任何网络通信
- **无数据收集** - 不收集用户数据
- **本地运行** - 所有数据保留在本地
- **ADB 沙箱** - 只使用 logcat 相关命令

---

> 本文档随架构演进持续更新。

