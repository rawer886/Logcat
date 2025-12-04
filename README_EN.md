<p align="center">
  <img src="public/icon.svg" width="80" height="80" alt="Logcat Logo">
</p>

<h1 align="center">Logcat</h1>

<p align="center">
  <strong>A High-Performance, Cross-Platform Android Logcat Viewer</strong>
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
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  English | <a href="./README.md">简体中文</a>
</p>

---

## ✨ Features

🎯 **A Lightweight Alternative to Android Studio Logcat**

- 🚀 **Blazing Fast** - Rust backend + virtual scrolling, handles millions of logs smoothly
- 🔍 **Smart Filtering** - Fully compatible with Android Studio filter syntax
- 📦 **Lightweight** - Only ~10MB installer, instant startup
- 🎨 **Modern UI** - Beautiful design with dark/light themes
- 🔄 **Seamless Import** - Supports `.logcat` format, works perfectly with Android Studio

## 📸 Screenshots

> Screenshots coming soon

## 📦 Installation

### Download

Go to [Releases](https://github.com/rawer886/Logcat/releases) to download:

| Platform | Download |
|----------|----------|
| Windows | `Logcat_x.x.x_x64-setup.exe` |
| macOS | `Logcat_x.x.x_x64.dmg` |
| Linux | `Logcat_x.x.x_amd64.deb` |

### Build from Source

```bash
# Prerequisites: Node.js 18+, Rust 1.70+, adb

git clone https://github.com/rawer886/Logcat.git
cd Logcat
npm install
npm run tauri dev      # Development
npm run tauri build    # Production build
```

## 🚀 Usage

### Quick Start

1. Connect your Android device or start an emulator
2. Open Logcat - it auto-detects and connects to devices
3. Start viewing logs!

### Filter Syntax

```bash
# Basic filters
tag:MainActivity          # TAG contains "MainActivity"
tag=:MainActivity         # TAG exactly matches
tag~:Main.*               # TAG regex match

# Combining filters
tag:Network message:error # AND - both conditions
tag:A | tag:B             # OR  - either condition
-tag:Ads                  # NOT - exclude

# More
level:WARN                # Level >= WARN
age:5m                    # Last 5 minutes
is:crash                  # Crash logs only
```

📖 See [Filter Documentation](docs/PRODUCT.md#4-过滤器语法) for complete syntax

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📋 Product Doc](docs/PRODUCT.md) | Features, UI guide, usage |
| [🏗️ Architecture](docs/ARCHITECTURE.md) | Technical design, modules |
| [📖 Development](docs/DEVELOPMENT.md) | Code standards, workflow |
| [📝 Changelog](CHANGELOG.md) | Version history |

## 🤝 Contributing

We welcome all contributions!

- 🐛 [Report Bugs](https://github.com/rawer886/Logcat/issues/new?template=bug_report.md)
- 💡 [Feature Requests](https://github.com/rawer886/Logcat/issues/new?template=feature_request.md)
- 📖 Improve documentation
- 🔧 Submit PRs

Please read [Contributing Guide](CONTRIBUTING.md) first.

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center"><strong>Tauri 2.0</strong><br/>Cross-platform</td>
    <td align="center"><strong>Rust</strong><br/>Backend</td>
    <td align="center"><strong>React 18</strong><br/>Frontend</td>
    <td align="center"><strong>TypeScript</strong><br/>Type-safe</td>
  </tr>
</table>

## 📄 License

[MIT License](LICENSE) © 2025

---

<p align="center">
  If you find this helpful, please give it a ⭐️!
</p>

<p align="center">
  <sub>Built with <a href="https://cursor.sh/">Cursor</a> AI</sub>
</p>

