# 贡献指南

首先，感谢你考虑为 Logcat 做出贡献！🎉

本文档将帮助你了解如何参与项目开发。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [提交规范](#提交规范)
- [代码审查](#代码审查)

---

## 行为准则

请保持友善和尊重。我们希望这是一个开放、包容的社区。

- 尊重不同的观点和经验
- 接受建设性的批评
- 专注于对社区最有利的事情

---

## 如何贡献

### 🐛 报告 Bug

在提交 Bug 之前，请：

1. 搜索 [现有 Issues](https://github.com/rawer886/Logcat/issues) 确认没有重复
2. 使用最新版本复现问题

提交时请包含：

- 操作系统和版本
- Logcat 版本
- 复现步骤
- 期望行为 vs 实际行为
- 相关日志或截图

### 💡 功能建议

我们欢迎功能建议！但请注意项目边界：

**✅ 我们接受的功能：**
- 日志查看和过滤相关
- 与 Android Studio Logcat 功能对齐
- 用户体验改进

**❌ 我们不接受的功能：**
- 与日志无关的设备管理
- 数据库/网络相关功能

### 🔧 提交 Pull Request

1. **Fork 仓库** 并克隆到本地
2. **创建分支**: `git checkout -b feat/your-feature`
3. **开发并测试** 你的改动
4. **提交代码**: 遵循 [提交规范](#提交规范)
5. **推送分支**: `git push origin feat/your-feature`
6. **创建 PR** 并描述你的改动

---

## 开发环境

### 前置要求

- Node.js 18+
- Rust 1.70+ (stable)
- Android SDK (adb)

### 安装步骤

```bash
# 克隆你的 fork
git clone https://github.com/YOUR_USERNAME/Logcat.git
cd Logcat

# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

### 项目结构

```
src/                    # React 前端
├── components/         # UI 组件
├── hooks/              # 自定义 Hooks
├── stores/             # Zustand 状态
├── lib/                # 工具函数
└── types/              # TypeScript 类型

src-tauri/              # Rust 后端
├── src/
│   ├── adb.rs          # ADB 通信
│   ├── parser.rs       # 日志解析
│   └── commands.rs     # IPC 命令
└── Cargo.toml
```

### 常用命令

```bash
npm run dev          # 启动 Vite 开发服务器
npm run tauri dev    # 启动 Tauri 开发模式
npm run tauri build  # 构建生产版本
npm run lint         # 代码检查
npm run typecheck    # 类型检查
```

---

## 提交规范

### Commit Message 格式

```
<type>: <subject>

[optional body]
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（不是新功能或修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |

### 示例

```bash
feat: 添加日志导出功能
fix: 修复过滤器解析错误
docs: 更新 README
refactor: 优化虚拟列表性能
```

### 注意事项

- 使用中文提交信息
- 主题行不超过 50 字符
- 使用祈使句（"添加" 而不是 "添加了"）

---

## 代码审查

所有 PR 都需要通过代码审查才能合并。

### 审查标准

- [ ] 代码符合项目规范
- [ ] 没有引入新的 lint 错误
- [ ] 功能符合项目边界
- [ ] 有必要的注释和文档
- [ ] 性能无明显下降

### 响应时间

我们会尽快审查你的 PR，通常在 1-3 天内。

---

## 🙏 致谢

感谢所有贡献者的付出！

<a href="https://github.com/rawer886/Logcat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=rawer886/Logcat" />
</a>

---

如有任何问题，欢迎在 [Discussions](https://github.com/rawer886/Logcat/discussions) 中讨论！

