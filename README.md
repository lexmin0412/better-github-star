# Better Github Star

Better Github Star 是一个 Chrome 浏览器扩展，旨在增强 GitHub 原生的 Star 功能。它允许你在收藏仓库时添加自定义标签，并通过 GitHub Gist 实现跨设备的数据同步，帮助你突破原生 Star List 限制，更高效地管理和检索收藏的代码库。

## ✨ 主要特性

*   **🏷️ 标签管理**：告别单一且受限制的 Star Lists。在 Star 仓库时，你可以为项目添加多个自定义标签（Tags），**突破官方 Lists 的 32 个数量上限**，建立属于自己的无限分类体系。
*   **☁️ 私有云同步**：数据安全地存储在你自己的 GitHub Gist 中。只要配置了 GitHub PAT (Personal Access Token)，你的标签和收藏数据即可在多台设备间自动同步。
*   **⚡ 分片存储**：采用分片存储策略（按仓库名首字母 A-Z 分片），有效解决了大量 Star 数据导致的同步性能问题和 Gist 大小限制。
*   **🎨 原生体验**：
    *   **深度集成**：无感替换 GitHub 仓库页原有的 Star 按钮逻辑。
    *   **交互升级**：提供比原生更流畅、更便捷的标签（List）选择与创建交互体验。
    *   **完美适配**：自动适配 GitHub 浅色/深色（Dark Mode）主题。
*   **🧩 便捷的弹窗 (Popup)**：
    *   **Tab 分页设计**：全新的 Tab 界面，区分“Lists”（列表概览）与“Settings”（设置）。
    *   **列表预览**：在 Popup 中直接查看合并后的所有 Star Lists 和自定义标签，快速导航。
*   **🔍 强大的管理页面**：
    *   **数据聚合**：同步 GitHub Star 数据（包括仓库和 Star List），并与 Gist 中的标签数据无缝合并。
    *   **高效浏览**：支持基于 API 分页的**懒加载**（Infinite Scroll），每次仅请求必要数据，极大提升加载成千上万个 Star 项目时的性能与速度。
    *   **深度搜索**：支持同时搜索仓库名称、描述（Description）和标签（Tags）。
    *   **智能排序**：按 Star 时间倒序排列，优先展示最近收藏的项目。
    *   **数据备份**：支持 JSON 格式的数据导出与导入，方便进行本地备份或数据迁移。
*   **🔒 数据隐私**：所有数据均存储在你的本地浏览器或私有 Gist 中，不经过任何第三方服务器，完全由你掌控。

## 🛠️ 技术栈

*   **Manifest V3**：采用最新的 Chrome 扩展标准开发，更安全、更稳定。
*   **Native JavaScript**：无任何第三方重型框架（如 React/Vue）依赖，轻量级，加载速度快。
*   **GitHub API**：直接与 GitHub API 交互，实现 Star 操作及 Gist 数据读写。

## 🚀 安装指南

### 1. 下载代码
```bash
git clone https://github.com/lexmin/better-github-star.git
```

### 2. 加载扩展
1.  打开 Chrome 浏览器，访问 `chrome://extensions/`。
2.  开启右上角的 **"开发者模式" (Developer mode)**。
3.  点击 **"加载已解压的扩展程序" (Load unpacked)**。
4.  选择本项目中的 `extension` 目录。

## ⚙️ 配置说明

为了使用云同步和标签功能，你需要进行简单的配置：

1.  **生成 GitHub PAT**:
    *   访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)。
    *   生成一个新的 Token (Classic)。
    *   **Scope 权限要求**：必须勾选 `gist` (用于数据同步) 和 `repo` (用于点赞仓库，如果是公开库可能只需要 `public_repo`)。

2.  **插件配置**:
    *   点击浏览器插件栏的 **Better Github Star** 图标，打开配置弹窗。
    *   在 **GitHub PAT** 输入框中填入刚才生成的 Token。
    *   点击 **Test & Save** 验证并保存。
    *   点击 **Create Private Gist & Bind** 初始化用于存储数据的 Gist（如果已有数据，会自动绑定）。
    *   勾选 **Enable Cloud Sync** 开启同步功能。

## 📂 项目结构

```
extension/
├── manifest.json        # 扩展配置文件 (Manifest V3)
├── background.js        # 后台服务 Worker (处理消息与初始化)
├── content.js           # 内容脚本 (注入 GitHub 页面逻辑)
├── popup.html/js/css    # 弹窗页面 (简易配置与状态)
├── options.html/js/css  # 选项页面 (完整配置)
├── lib/                 # 核心逻辑库
│   ├── github.js        # GitHub API 封装
│   ├── shard.js         # 数据分片算法
│   └── storage.js       # 存储层封装 (Local + Gist)
└── ui/                  # UI 资源
    └── tag-panel.css    # 注入页面的样式文件
```

## 📝 待办事项 / 计划

*   [x] 添加按标签筛选/搜索仓库的独立页面（已在 Options 页面实现）。
*   [x] 支持导出/导入数据（已在 Options 页面实现）。
*   [ ] 优化标签输入的交互体验（支持自动补全）。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个项目！

## 📄 许可证

MIT License
