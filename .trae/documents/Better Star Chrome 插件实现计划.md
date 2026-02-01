**JSON 分片更新**

* 分片文件固定为 27 个：better-star-A.json ... better-star-Z.json + better-star-0.json。

* 分片规则：以仓库名 repo 的首字母（不区分大小写）映射到 A–Z；非 A–Z（数字、符号、其他语系）统一归入 better-star-others.json。

* 标签与配置独立：meta-tags.json（全局标签字典、偏好与版本）。

**目标与功能**

* 仓库页新增“收藏”按钮：执行 star 并选择/创建标签；突破官方 Star List 限制。

* 选项页：PAT 配置与校验；私有 Gist 创建/绑定；导入/导出；云同步开关。

* 全局收藏列表页：懒加载分片、搜索、按标签筛选、编辑标签、删除（可选同时 unstar）。

**架构（MV3）**

* manifest.json：content\_scripts（匹配 <https://github.com/*）、background.service_worker、options.html、favorites.html；权限：storage、scripting、activeTab、host_permissions（https://api.github.com/*）。>

* content script：插入“收藏”按钮与标签面板；解析 owner/repo；与 background 通信。

* background/service worker：PAT 管理；GitHub API（star/unstar、Gist）；分片寻址与同步；本地缓存；消息路由。

* options：PAT 设置/校验；Gist 同步；绑定/创建；导入/导出。

* favorites：懒加载分片；搜索/过滤；编辑/删除；批量操作（后续增强）。

**数据模型**

* chrome.storage.local：{ pat, gistId, syncEnabled, lastSyncAt }。

* 分片文件结构：{ version, entries: \[{ full\_name, url, tags:\[string], starredAt, note? }] }

* meta-tags.json：{ version, tags:\[string], preferences:{ othersFile:"better-star-others.json" } }

**API**

* Star：PUT /user/starred/{owner}/{repo}；Unstar：DELETE /user/starred/{owner}/{repo}

* Gist：POST/GET/PATCH /gists/{id}（分别处理 27 个分片与 meta-tags.json）

* 头信息：Authorization: Bearer <PAT>；Accept: application/vnd.github+json；X-GitHub-Api-Version: 2022-11-28

**寻址与同步**

* shardOf(repo)：首字符 A–Z → A–Z；否则 → others。

* Upsert：仅读取并更新目标分片；标签更新同步 meta-tags.json。

* 展示：默认加载 A 与 others 两个分片，滚动/筛选时再加载其余；缓存 + 过期策略。

**交互与样式**

* 复用 GitHub 按钮类名；回退内联样式确保统一风格。

* 标签面板：最近标签 + 新建输入；多选；toast 成功/失败。

* favorites：搜索 + tag 过滤；内联标签编辑；删除条目（支持同时取消 star）。

**容错与安全**

* 未配置 PAT：引导至选项页；禁用收藏按钮。

* API 错误与速率限制：清晰提示；重试机制；不落盘失败记录。

* PAT 仅存本地；私有 Gist；不记录敏感日志。

**目录结构**

* /extension

  * manifest.json

  * background.js

  * content.js

  * options.html / options.js / options.css

  * favorites.html / favorites.js / favorites.css

  * lib/github.js（star/unstar、gist）

  * lib/shard.js（A–Z + others 分片逻辑）

  * lib/storage.js（local 缓存）

  * ui/tag-panel.css

**验收**

* 加载扩展 → 配置 PAT → 仓库页收藏并加标签 → 验证对应分片/others 更新 → favorites 展示、编辑与删除正常。

如需将分片初始只创建在有数据时（懒创建），我也可按此优化。
