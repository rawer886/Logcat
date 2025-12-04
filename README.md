<p align="center">
  <img src="public/icon.svg" width="80" height="80" alt="Logcat Logo">
</p>

<h1 align="center">Logcat</h1>

<p align="center">
  <strong>高性能、跨平台的 Android Logcat 日志查看工具</strong>
</p>

<p align="center">
  <a href="https://github.com/rawer886/Logcat/releases">
    <img src="https://img.shields.io/github/v/release/rawer886/Logcat?style=flat-square" alt="Release">
  </a>
  <a href="https://github.com/rawer886/Logcat/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/rawer886/Logcat?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/rawer886/Logcat/stargazers">
    <img src="https://img.shields.io/github/stars/rawer886/Logcat?style=flat-square" alt="Stars">
  </a>
</p>

<p align="center">
  <a href="#-特性">特性</a> •
  <a href="#-安装">安装</a> •
  <a href="#-使用">使用</a> •
  <a href="#-文档">文档</a> •
  <a href="#-贡献">贡献</a>
</p>

<p align="center">
  <a href="./README_EN.md">English</a> | 简体中文
</p>

---

## ✨ 特性

🎯 **Android Studio Logcat 的轻量替代品**

- 🚀 **极致性能** - Rust 后端 + 虚拟滚动，百万级日志丝滑流畅
- 🔍 **智能过滤** - 完全兼容 Android Studio 过滤语法，无缝迁移
- 📦 **轻量便携** - 安装包仅 ~10MB，秒速启动
- 🎨 **现代界面** - 精心设计的 UI，支持深色/浅色主题
- 🔄 **无缝导入** - 支持 `.logcat` 格式，与 Android Studio 完美互通

## 📸 截图

> 截图待添加

## 📦 安装

### 下载安装包

前往 [Releases](https://github.com/rawer886/Logcat/releases) 下载对应平台的安装包：

| 平台 | 下载 |
|------|------|
| Windows | `Logcat_x.x.x_x64-setup.exe` |
| macOS | `Logcat_x.x.x_x64.dmg` |
| Linux | `Logcat_x.x.x_amd64.deb` |

### 从源码构建

```bash
# 前置要求: Node.js 18+, Rust 1.70+, adb

git clone https://github.com/rawer886/Logcat.git
cd Logcat
npm install
npm run tauri dev      # 开发模式
npm run tauri build    # 构建发布版
```

## 🚀 使用

### 快速开始

1. 连接 Android 设备或启动模拟器
2. 打开 Logcat，自动检测并连接设备
3. 开始查看日志！

### 过滤语法

```bash
# 基础过滤
tag:MainActivity          # TAG 包含 "MainActivity"
tag=:MainActivity         # TAG 精确匹配
tag~:Main.*               # TAG 正则匹配

# 组合过滤
tag:Network message:error # AND - 同时满足
tag:A | tag:B             # OR  - 满足任一
-tag:Ads                  # NOT - 排除

# 更多
level:WARN                # 级别 >= WARN
age:5m                    # 最近 5 分钟
is:crash                  # 崩溃日志
```

📖 完整语法请参考 [过滤器文档](docs/PRODUCT.md#4-过滤器语法)

## 📚 文档

| 文档 | 说明 |
|------|------|
| [📋 产品文档](docs/PRODUCT.md) | 完整功能说明、界面介绍、使用指南 |
| [🏗️ 架构文档](docs/ARCHITECTURE.md) | 技术架构、模块设计、数据流 |
| [📖 开发指南](docs/DEVELOPMENT.md) | 代码规范、开发流程、最佳实践 |
| [📝 更新日志](CHANGELOG.md) | 版本历史、功能变更 |

## 🤝 贡献

我们欢迎各种形式的贡献！

- 🐛 [报告 Bug](https://github.com/rawer886/Logcat/issues/new?template=bug_report.md)
- 💡 [功能建议](https://github.com/rawer886/Logcat/issues/new?template=feature_request.md)
- 📖 完善文档
- 🔧 提交 PR

请先阅读 [贡献指南](CONTRIBUTING.md)。

## 🛠️ 技术栈

<table>
  <tr>
    <td align="center"><strong>Tauri 2.0</strong><br/>跨平台框架</td>
    <td align="center"><strong>Rust</strong><br/>高性能后端</td>
    <td align="center"><strong>React 18</strong><br/>现代前端</td>
    <td align="center"><strong>TypeScript</strong><br/>类型安全</td>
  </tr>
</table>

## 📄 许可证

[MIT License](LICENSE) © 2025

---

<p align="center">
  如果这个项目对你有帮助，请给一个 ⭐️ 支持一下！
</p>

<p align="center">
  <sub>Built with <a href="https://cursor.sh/">Cursor</a> AI</sub>
</p>
