# easemob-uikit-integration（集成侧 Agent Skill）

面向**下游接入者**的 Agent 技能：让 AI 助手（Claude Code / Cursor / 其他支持 Agent Skills 的客户端）在
帮用户把 `@easemob/uikit-im` 接入 Vue3 项目时，能正确写出安装、`EmUIKitProvider` 配置、组件用法、主题与
H5 适配代码。

> 与仓库 `.agent/skills/*`（维护者内部开发技能）**相互独立**，本目录描述的是**发布包的对外契约**。

## 目录结构

```
integrations/skills/
  SKILL.md                  # 入口：何时使用 + 核心链路 + 子文件索引 + 关键契约
  reference/
    quickstart.md           # 安装 / 注册 / 最小接入 / useClient 登录
    provider.md             # EmUIKitProvider 全量配置
    components.md           # 组件清单与分类
    theming.md              # 主题 / 暗色 / 密度 / 字号
    h5.md                   # H5 适配
    gotchas.md              # 高频坑与硬规则
    api/*.md                # 组件 API 明细（自动同步，勿手改）
  scripts/gen-skill.mjs     # 从 apps/docs 文档源同步 reference/api/*.md
```

## 安装到你的 Agent 客户端

将本目录（`integrations/skills/`）复制或软链到目标项目的 skills 目录，客户端即会自动加载：

- **Claude Code**：`.claude/skills/easemob-uikit-integration/`（或全局 `~/.claude/skills/`）
- **Cursor**：项目 `.cursor/skills/`（依客户端实际支持的 skills 规范为准）
- **其他客户端**：按其 Agent Skills 规范放到对应的 skills 目录

> 本技能只需 Markdown，无运行时依赖，任何支持「按需加载 SKILL.md」的 Agent 客户端都能用。

## 同步组件 API（维护者）

`reference/api/*.md` 是从文档站自动生成的组件 API 表，**不要手改**。文档站 API 更新后重跑：

```bash
node integrations/skills/scripts/gen-skill.mjs
```

该脚本会读取 `apps/docs/.vitepress/gen/*.md`（由 `pnpm -F @easemob/docs gen:api` 产出）并复制到
`reference/api/`，同时生成 `reference/api/README.md` 索引。
