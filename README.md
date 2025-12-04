# Logcat

一个高性能、跨平台的 Android Logcat 日志查看工具。

![Logcat Screenshot](./screenshot.png)

## ✨ 特性

- 🚀 **高性能** - Rust 后端 + 虚拟滚动，轻松处理百万级日志
- 🎨 **美观界面** - 现代化 UI 设计，深色/浅色主题
- 🔍 **强大过滤** - 支持日志级别、TAG、关键词、正则表达式过滤
- 💾 **过滤器预设** - 保存和快速切换常用过滤器
- 📱 **多设备支持** - 自动检测连接的 Android 设备和模拟器
- 📤 **日志导出** - 支持 TXT、JSON、CSV 格式导出
- ⚡ **轻量级** - 安装包 < 10MB，内存占用低

## 🖥️ 支持平台

- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu, Fedora, etc.)

## 📦 安装

### 从 Release 下载

前往 [Releases](https://github.com/your-repo/logcat/releases) 下载对应平台的安装包。

### 从源码构建

#### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- [Android SDK](https://developer.android.com/studio) (需要 adb 命令)

#### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/your-repo/logcat.git
cd logcat

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 🚀 使用方法

1. 确保已安装 Android SDK 并且 `adb` 命令可用
2. 连接 Android 设备或启动模拟器
3. 启动 Logcat 应用
4. 从设备列表中选择目标设备
5. 点击"开始"按钮开始捕获日志

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + F` | 聚焦搜索框 |
| `Ctrl/Cmd + K` | 清空日志 |
| `Ctrl/Cmd + E` | 导出日志 |
| `Space` | 暂停/恢复 |

## 🛠️ 技术栈

- **框架**: [Tauri 2.0](https://tauri.app/)
- **后端**: Rust
- **前端**: React 18 + TypeScript
- **UI**: Tailwind CSS + Radix UI
- **状态管理**: Zustand
- **虚拟列表**: @tanstack/react-virtual

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系

如有问题或建议，请提交 Issue。

