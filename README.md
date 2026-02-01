<div align="center">
  <h1 align="center">Better Star</h1>

  <p align="center">
    <strong>你的 GitHub 收藏夹增强神器</strong>
  </p>

  <p align="center">
    Built with Vanilla JS, Chrome Extension MV3, and GitHub Gist.
  </p>

  <p align="center">
    <a href="#features"><strong>功能特性</strong></a> ·
    <a href="#tech-stack"><strong>技术栈</strong></a> ·
    <a href="#getting-started"><strong>快速开始</strong></a> ·
    <a href="#development"><strong>本地开发</strong></a>
  </p>

  <br/>

  ![License](https://img.shields.io/badge/license-MIT-blue)
  ![Version](https://img.shields.io/badge/version-0.1.0-green)
  ![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)
</div>

<br/>

## ✨ Why Better Star?

GitHub 原生的 Star 功能随着收藏项目的增多，管理起来会变得非常困难：

- **查找困难**：想找一个之前收藏的 "HTTP 库"，却只能在数千个 Star 列表中漫无目的地翻阅。
- **分类单一**：官方的 Lists 功能层级较深，且不支持灵活的多维度标签。
- **同步繁琐**：跨设备管理收藏夹体验不佳。

**Better Star** 改变了这一切。它允许你以最自然的方式管理收藏：
- "这是一个 #React 组件库，也是一个 #UI 框架" —— 支持多标签管理。
- 数据存储在你的 **私有 Gist** 中，安全且完全由你掌控。
- 完美融入 GitHub 原生界面，就像它是 GitHub 的一部分。

## Features

- **🏷️ 标签管理**: 直接在仓库页面为项目添加、编辑标签，支持多选和新建。
- **☁️ 云端同步**: 基于 GitHub Gist 的私有云同步，支持多设备间的数据共享。
- **⚡ 高性能存储**: 采用智能分片策略（A-Z + others），即使有数万个收藏也能保持秒级响应。
- **🎨 原生体验**: 注入式 UI 设计，完美适配 GitHub 的亮色/暗色模式（Dark Mode）。
- **🔒 隐私安全**: Personal Access Token (PAT) 仅存储在本地，数据加密存储于你的私有 Gist。
- **⚙️ 高度定制**: 支持隐藏 GitHub 原生 Star 按钮，提供纯净的增强体验。

## Tech Stack

- **Core**: [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: CSS Variables (Theme aware)
- **API**: [GitHub REST API](https://docs.github.com/en/rest)
- **Storage**: Chrome Storage API + GitHub Gist

## Getting Started

### Prerequisites

- Chrome 浏览器（或 Edge, Brave 等 Chromium 内核浏览器）
- GitHub 账号（用于生成 PAT 和存储 Gist 数据）

### Installation

1. **克隆仓库**

   ```bash
   git clone https://github.com/lexmin/better-star.git
   cd better-star
   ```

2. **加载扩展**

   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 打开右上角的 **"开发者模式" (Developer mode)**
   - 点击 **"加载已解压的扩展程序" (Load unpacked)**
   - 选择项目中的 `extension` 目录

### Configuration

1. **生成 GitHub PAT**
   - 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - 生成一个新的 Token (Classic)
   - **权限要求**:
     - `gist`: 用于同步数据
     - `public_repo` / `repo`: 用于执行 Star 操作

2. **配置插件**
   - 点击浏览器工具栏的 Better Star 图标
   - 输入你的 PAT 并点击 **Test & Save**
   - 点击 **Create Private Gist & Bind** 初始化云端存储
   - (可选) 勾选 **Enable Cloud Sync** 开启自动同步
   - (可选) 勾选 **Hide Native Star Button** 以获得更沉浸的体验

## Project Structure

```
extension/
├── manifest.json        # 扩展配置文件 (MV3)
├── background.js        # 后台服务 (API 请求, 分片逻辑)
├── content.js           # 页面注入脚本 (UI 交互)
├── popup.html/js/css    # 扩展弹窗 (设置页)
├── options.html/js/css  # 完整选项页 (管理面板)
├── lib/                 # 核心库
│   ├── github.js        # GitHub API 封装
│   ├── shard.js         # 分片存储算法
│   └── storage.js       # 本地存储封装
└── ui/                  # UI 资源
    └── tag-panel.css    # 注入面板样式
```

## License

[MIT License](./LICENSE)

## Acknowledgements

- 灵感来源于对高效管理 GitHub Stars 的渴望。
- 感谢 [GitHub API](https://docs.github.com/en/rest) 提供的强大能力。
