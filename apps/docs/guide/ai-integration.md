# AI 集成（Skills / MCP）

环信 UIKit 除提供 Vue 3 组件与文档站外，还面向下游接入者提供两类 AI 辅助能力，让 AI 助手（Claude Code、Cursor 等）能更准确地帮你完成接入与二次开发：

- **Agent Skills**：一套静态知识包（Markdown），教 AI「怎么写 UIKit 集成代码」——安装、`EmUIKitProvider` 配置、组件用法、主题与 H5 适配、常见坑。
- **MCP 服务**：一个运行时服务（`@easemob/uikit-mcp`），让 AI 能实时「查文档 / 查组件 API / 查版本 / 校验配置」。

两者共用同一份数据源（本文档站与根 `CHANGELOG.md`），随 UIKit 版本同步更新。

## Agent Skills

### 安装

Skills 包位于仓库 `integrations/skills/`（入口 `SKILL.md`），纯 Markdown、无运行时依赖。将其复制或软链到目标项目的 skills 目录即可：

- Claude Code：`.claude/skills/easemob-uikit-integration/`（或全局 `~/.claude/skills/`）
- Cursor：项目 `.cursor/skills/`（按客户端实际支持的 skills 规范为准）

### 内容结构

```
integrations/skills/
  SKILL.md                # 入口：核心接入链路 + 子文件索引 + 关键契约
  reference/
    quickstart.md         # 安装 / 注册 / 最小接入 / useClient 登录
    provider.md           # EmUIKitProvider 全量配置
    components.md         # 组件清单与分类
    theming.md            # 主题 / 暗色 / 密度 / 字号
    h5.md                 # H5 适配
    gotchas.md            # 高频坑与硬规则
    api/                  # 27 个组件的 props / emits / slots 明细（自动同步）
```

## MCP 服务

### 接入

在支持 MCP 的客户端（Claude Desktop、Cursor 等）配置里注册：

```jsonc
{
  "mcpServers": {
    "easemob-uikit": {
      "command": "npx",
      "args": ["-y", "@easemob/uikit-mcp"]
    }
  }
}
```

### 工具

- `list_components` —— 列出全部组件（含分类与中文名）
- `get_component_api` —— 返回指定组件的 props / emits / slots 明细
- `search_docs` —— 在接入指南与组件 API 文档中全文搜索
- `get_latest_version` —— 查 npm 最新版本并与本地快照对比
- `validate_provider_config` —— 校验 `EmUIKitProvider` 配置合法性

### 资源

- `uikit://guide/*` —— 接入指南（快速开始 / 主题 / H5 等）
- `uikit://component/*` —— 组件 API 明细
- `uikit://changelog` —— 更新日志

## 数据源与同步

Skills 与 MCP 均以本文档站为单一数据源，避免文档分叉：

- Skills 的 `reference/api/` 由 `integrations/skills/scripts/gen-skill.mjs` 从组件 API 表同步；
- MCP 的文档快照由 `packages/mcp/scripts/sync-docs.mjs` 在构建时打入发布包。

更新组件 API 后重跑对应脚本，即可保持文档站 / Skills / MCP 三者一致。
