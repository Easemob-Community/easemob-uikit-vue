# AGENTS 规则（easemob-uikit-vue）

本文件是仓库协作规则与 skill 路由入口。`easemob-uikit-vue` 是基于 `easemob-websdk`(websdk2 / SDK5) 的 Vue3 UIKit（pnpm workspace，核心包 `@easemob/uikit`）。

## 高优先级规则

- 协作沟通、计划、变更说明默认**中文**；对外组件 API / props / emits 的注释与文档尽量中英双语。
- 修改后**必须先验证再提交**：验证门禁是**类型检查 + 构建**，不是 lint 全绿。
  - 类型检查：`pnpm -F @easemob/uikit exec vue-tsc --noEmit`（0 错误）
  - 构建：`pnpm -F @easemob/uikit build`（= `vite build && vue-tsc --emitDeclarationOnly`，约 9s）
  - demo 类型检查：`cd apps/demo && pnpm exec vue-tsc --noEmit`
- 每次 `git commit` 的 message 用**中文**；**不主动 `git push`**，不做其它 git 变更（reset/rebase/force 等），除非用户明确要求，且每次都需再确认。
- 暂存后确认没混入产物/依赖：`git diff --cached --name-only | grep -E 'dist/|node_modules/|\.tgz$'` 应为空（`dist/` 已 gitignore）。
- 大改动先写计划、等确认再编码；涉及公开 API（组件名 / props / emits / 导出）改动先说明影响面。
- 发现的技术债记进根 `TECH-DEBT.md`，逐条修复并勾选归档；不要为了「好看」大面积 `--fix` 未改动文件。

## 工具链事实（省掉重复踩坑）

- pnpm 9 workspace；Vue3 + Pinia(setup-store) + Vite + TS strict。
- eslint 是 `@antfu/eslint-config` **flat config**（根 `eslint.config.js`）：**`--ext` 无效**，直接传文件/目录路径。
- `no-console` 允许 `warn`/`error`，只禁 `log/info/debug`；`**/*.story.vue` 已放开 console/alert。
- 公开事件统一 **kebab-case**，由 `vue/custom-event-name-casing: ['error','kebab-case']` 强制。
- **demo 运行时走 vite alias `@easemob/uikit` → `packages/uikit/src`**（源码），改 src 刷新即生效，无需重建 dist；但 demo 的 `vue-tsc` 解析的是已构建 dist 类型，改公开 API 后要重建 dist 才能让 demo 类型检查一致。
- macOS 自带 bash 3.2 无 `mapfile`。

## Skill 路由表

| Skill | 适用场景 | 触发词示例 | 文件 |
| --- | --- | --- | --- |
| `uikit-component-authoring` | 新增/修改组件、模块、容器；props/emits/导出/命名规范 | `写组件`、`加个组件`、`组件规范`、`emits 命名`、`Em 前缀`、`导出/resolver` | [.agent/skills/uikit-component-authoring/SKILL.md](.agent/skills/uikit-component-authoring/SKILL.md) |
| `uikit-styling-theming` | 改样式、主题、暗色、CSS 变量、颜色/圆角/动效 token | `改样式`、`主题`、`暗色`、`CSS 变量`、`颜色 token`、`unocss` | [.agent/skills/uikit-styling-theming/SKILL.md](.agent/skills/uikit-styling-theming/SKILL.md) |
| `uikit-store-composable` | 加/改 Pinia store、composable、状态管理、vueuse 用法 | `加 store`、`写 composable`、`加 hook`、`状态管理`、`用 vueuse` | [.agent/skills/uikit-store-composable/SKILL.md](.agent/skills/uikit-store-composable/SKILL.md) |
| `uikit-i18n-locale` | 加/改文案、多语言、翻译 key | `加文案`、`多语言`、`i18n`、`翻译`、`locale` | [.agent/skills/uikit-i18n-locale/SKILL.md](.agent/skills/uikit-i18n-locale/SKILL.md) |
| `uikit-tiptap-editor` | 改消息输入框、富文本、@提及、编辑器行为 | `改输入框`、`富文本`、`@提及`、`tiptap`、`编辑器` | [.agent/skills/uikit-tiptap-editor/SKILL.md](.agent/skills/uikit-tiptap-editor/SKILL.md) |
| `uikit-h5-adaptation` | H5/移动端适配：安全区、键盘、下拉刷新、长按、viewport | `H5 适配`、`安全区`、`键盘`、`下拉刷新`、`长按`、`viewport` | [.agent/skills/uikit-h5-adaptation/SKILL.md](.agent/skills/uikit-h5-adaptation/SKILL.md) |
| `websdk2-uikit-migration` | SDK 层（sdk/domain/adapter/event）架构与迁移 | `迁移 SDK`、`重写 uikit sdk`、`domain 层`、`websdk2 最佳实践` | [.agent/skills/websdk2-uikit-migration/SKILL.md](.agent/skills/websdk2-uikit-migration/SKILL.md) |
| `uikit-lint-governance` | 处理 eslint、lint 治理、非代码改动层决策、收尾提交 | `跑 lint`、`清 lint`、`改 eslint 配置`、`提交前检查` | [.agent/skills/uikit-lint-governance/SKILL.md](.agent/skills/uikit-lint-governance/SKILL.md) |

路由规则：

- 先按触发词匹配对应 skill；命中任意 `.agent/skills/*` 后，先用一句短话显式提示命中的 skill 名，例如：`本次命中 skill: uikit-styling-theming`。
- 多个命中时按「先理解层（component/store/styling/i18n/tiptap/h5 对应域）→ SDK 层（migration）→ 收尾（lint-governance）」组合。
- 涉及具体待修问题时，先查根 `TECH-DEBT.md` 是否已登记，避免重复排查。

## 上下文入口

- 依赖/规范体系：本文件「Skill 路由表」+ `.agent/skills/*`
- 技术债与待修：根 [TECH-DEBT.md](TECH-DEBT.md)
- 核心包源码：`packages/uikit/src`（`components/` 原子、`modules/` 业务块、`containers/` 页面容器、`store/`、`composables/`、`sdk/`、`theme/`、`locale/`）
- 示例工程：`apps/demo`（vite alias 直连源码）、`apps/docs`（vitepress）
- 组件 story：`packages/uikit/src/**/*.story.vue`（Histoire）
