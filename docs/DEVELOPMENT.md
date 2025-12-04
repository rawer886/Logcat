# 开发指南

本文档为 Logcat 项目的开发规范和最佳实践指南。

---

## 1. 开发环境配置

### 1.1 前置要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 前端构建 |
| Rust | 1.70+ (stable) | 后端开发 |
| Android SDK | - | ADB 命令 |

### 1.2 推荐 IDE 配置

**VS Code / Cursor 插件：**
- rust-analyzer
- Tailwind CSS IntelliSense
- ESLint
- Prettier

### 1.3 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/rawer886/Logcat.git
cd Logcat

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run tauri dev
```

---

## 2. 项目结构

```
logcat/
├── src/                      # 前端源码
│   ├── components/           # React 组件
│   ├── hooks/                # 自定义 Hooks
│   ├── stores/               # Zustand 状态
│   ├── lib/                  # 工具函数
│   ├── types/                # TypeScript 类型
│   ├── App.tsx               # 根组件
│   └── main.tsx              # 入口文件
│
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── main.rs           # Tauri 入口
│   │   ├── commands.rs       # IPC 命令
│   │   ├── adb.rs            # ADB 通信
│   │   └── parser.rs         # 日志解析
│   └── Cargo.toml            # Rust 依赖
│
├── docs/                     # 项目文档
│   ├── PRODUCT.md            # 产品文档
│   ├── ARCHITECTURE.md       # 架构文档
│   └── DEVELOPMENT.md        # 开发指南（本文件）
│
├── public/                   # 静态资源
├── scripts/                  # 构建脚本
└── package.json              # Node 依赖
```

---

## 3. 编码规范

### 3.1 TypeScript / React

**文件命名：**
```
组件文件:     PascalCase.tsx    (LogList.tsx)
Hook 文件:    camelCase.ts      (useLogStream.ts)
工具文件:     camelCase.ts      (utils.ts)
类型文件:     index.ts
```

**组件结构：**
```typescript
// 1. 导入
import React, { useState, useCallback, useMemo } from "react";
import { cn } from "../lib/utils";

// 2. 类型定义
interface Props {
  data: string;
  onAction?: () => void;
}

// 3. 组件
export function ComponentName({ data, onAction }: Props) {
  // 3.1 Hooks（按顺序：state, derived, callbacks, effects）
  const [state, setState] = useState(false);
  
  const derived = useMemo(() => {
    return processData(data);
  }, [data]);
  
  const handleClick = useCallback(() => {
    setState(true);
    onAction?.();
  }, [onAction]);
  
  // 3.2 渲染
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

**避免的模式：**
```typescript
// ❌ 组件过大（超过 300 行）
// ❌ 在组件内定义子组件
// ❌ 超过 5 层嵌套
// ❌ 在渲染中创建新对象/函数
// ❌ 直接修改状态
```

### 3.2 Rust

**模块划分：**
```rust
// adb.rs     - ADB 通信，进程管理
// parser.rs  - 日志解析
// commands.rs - IPC 命令定义
// filter.rs  - 过滤逻辑（可选）
```

**错误处理：**
```rust
// ✅ 使用 Result 和 ? 操作符
fn do_something() -> Result<T, Error> {
    let value = fallible_operation()?;
    Ok(value)
}

// ❌ 避免 unwrap() 在生产代码
let value = option.unwrap();  // 不推荐
```

**命名规范：**
```rust
// 函数/变量: snake_case
fn parse_log_line() {}
let device_id = "...";

// 类型/结构体: PascalCase
struct LogEntry {}
enum LogLevel {}

// 常量: SCREAMING_SNAKE_CASE
const MAX_LOG_COUNT: usize = 100000;
```

### 3.3 CSS / Tailwind

**优先使用 Tailwind 类：**
```tsx
// ✅ 推荐
<div className="flex items-center gap-2 px-4 py-2">

// ❌ 避免内联样式
<div style={{ display: 'flex', alignItems: 'center' }}>
```

**使用 cn() 组合条件类：**
```tsx
import { cn } from "../lib/utils";

<button className={cn(
  "px-4 py-2 rounded",
  isActive && "bg-accent text-white",
  disabled && "opacity-50 cursor-not-allowed"
)}>
```

---

## 4. Git 工作流

### 4.1 分支策略

```
main           # 稳定版本，随时可发布
├── feat/*     # 功能开发分支
├── fix/*      # Bug 修复分支
└── docs/*     # 文档更新分支
```

### 4.2 提交规范

**格式：**
```
<type>: <subject>

[optional body]
```

**类型：**
| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式 |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具 |

**示例：**
```bash
feat: 添加日志导出功能
fix: 修复过滤器解析错误
docs: 更新架构文档
refactor: 优化虚拟列表性能
```

### 4.3 PR 流程

1. 从 `main` 创建功能分支
2. 开发并测试
3. 提交 PR，填写描述
4. 等待 Code Review
5. 合并到 `main`

---

## 5. 测试指南

### 5.1 测试范围

| 模块 | 优先级 | 类型 |
|------|--------|------|
| 过滤器解析 | 高 | 单元测试 |
| 日志解析 | 高 | 单元测试 |
| 导入导出 | 中 | 集成测试 |
| UI 交互 | 低 | 手动测试 |

### 5.2 运行测试

```bash
# 前端测试
npm run test

# Rust 测试
cd src-tauri && cargo test
```

---

## 6. 性能优化指南

### 6.1 前端优化

```typescript
// ✅ 使用 React.memo 避免重渲染
const LogRow = memo(function LogRow({ entry }: Props) {
  return <div>...</div>;
});

// ✅ 使用 useMemo 缓存计算
const filteredLogs = useMemo(() => {
  return logs.filter(matchesFilter);
}, [logs, filter]);

// ✅ 使用 useCallback 缓存回调
const handleClick = useCallback(() => {
  doSomething();
}, [deps]);

// ✅ 虚拟滚动处理长列表
import { useVirtualizer } from "@tanstack/react-virtual";
```

### 6.2 后端优化

```rust
// ✅ 使用缓存避免重复计算
struct ProcessCache {
    cache: HashMap<u32, ProcessInfo>,
    last_update: Instant,
}

// ✅ 批量处理日志
fn process_logs_batch(logs: Vec<String>) -> Vec<LogEntry> {
    logs.par_iter()  // 并行处理
        .filter_map(|line| parse_log_line(line).ok())
        .collect()
}
```

---

## 7. 项目约束

### 7.1 项目边界

**✅ 允许：**
- 日志查看和过滤
- 导入导出日志文件
- 显示设置调整
- 与 Android Studio 功能对齐

**❌ 禁止：**
- 数据库存储
- 网络请求（除 ADB）
- 与日志无关的设备功能

### 7.2 技术约束

**技术栈锁定：**
- Tauri（不迁移 Electron）
- React（不迁移 Vue/Svelte）
- Tailwind CSS（不用 CSS-in-JS）
- Zustand（不用 Redux）

**依赖管理：**
- 新增依赖需评估体积和必要性
- 禁止大型 UI 框架（Ant Design, Material UI）
- 单个依赖不超过 100KB

### 7.3 包体积预算

| 指标 | 预算 |
|------|------|
| 安装包 | < 15 MB |
| 前端 JS | < 500 KB |
| 空闲内存 | < 100 MB |

---

## 8. 常见问题

### Q: 如何添加新的过滤器类型？

1. 在 `utils.ts` 的 `FILTER_SUGGESTIONS` 添加提示
2. 在 `parseLogcatQuery()` 添加解析逻辑
3. 在 `matchesQuery()` 添加匹配逻辑

### Q: 如何添加新的 IPC 命令？

1. 在 `src-tauri/src/commands.rs` 定义函数
2. 在 `src-tauri/src/main.rs` 注册命令
3. 前端通过 `invoke("command_name")` 调用

### Q: 如何添加新的设置项？

1. 在 `types/index.ts` 的 `AppSettings` 添加字段
2. 在 `DEFAULT_SETTINGS` 添加默认值
3. 在 `SettingsPanel.tsx` 添加 UI
4. 在相关组件中读取并应用

---

## 9. 资源链接

- [Tauri 文档](https://tauri.app/v2/guides/)
- [React 文档](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)

---

> 如有问题，欢迎在 [Discussions](https://github.com/rawer886/Logcat/discussions) 讨论！
