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
- **Avatar 形状统一走主题**：`Avatar` 组件默认读取 `themeStore.avatarShape`（`props.shape` 为 `undefined` 时回落）。业务组件/列表项/卡片中复用 `Avatar` 时，默认不要硬编码 `shape`；只有明确需要覆盖主题时才传入。已修复历史硬编码点：`UserCard`、`GroupCard`、`ContactItem*`、`GroupItem*`、`ContactList`、`GroupList`。
- **枚举字符串统一走 `src/constants/index.ts`**：会话类型/消息类型/消息状态/群成员角色/转发模式等枚举字符串（`CONVERSATION_TYPE`/`MESSAGE_TYPE`/`MESSAGE_STATUS`/`GROUP_MEMBER_ROLE`/`FORWARD_MODE`/`ACK_TYPE` 等）**禁止在业务代码（composables/sdk/modules/containers/story）硬编码字面量**，类型联合用导出的类型别名（`ConversationTypeValue` 等）；仅定义处（constants 自身、sdk 契约类型）与 SDK wire 协议字段（`'img'`/`'audio'`/`'txt'`）保留字面量。详见 skill `uikit-component-authoring` 第 8 节。

## 工具链事实（省掉重复踩坑）

- pnpm 9 workspace；Vue3 + Pinia(setup-store) + Vite + TS strict。
- eslint 是 `@antfu/eslint-config` **flat config**（根 `eslint.config.js`）：**`--ext` 无效**，直接传文件/目录路径。
- `no-console` 允许 `warn`/`error`，只禁 `log/info/debug`；`**/*.story.vue` 已放开 console/alert。
- 公开事件统一 **kebab-case**，由 `vue/custom-event-name-casing: ['error','kebab-case']` 强制。
- **demo 运行时走 vite alias `@easemob/uikit` → `packages/uikit/src`**（源码），改 src 刷新即生效，无需重建 dist；但 demo 的 `vue-tsc` 解析的是已构建 dist 类型，改公开 API 后要重建 dist 才能让 demo 类型检查一致。
- **SDK 双引入模式**：`easemob-websdk` 子包依赖声明恒为 `^5.0.0-beta.1`（生产/发布，跟随 5.x 正式版与 beta 线）；本地 tgz 联调用 `pnpm sdk:use-tgz` / `pnpm sdk:use-npm` 切换（根 `package.json` 的 `pnpm.overrides` 指向根目录 `easemob-websdk-5.0.0.tgz`，切换后需 `pnpm install`）；`pnpm sdk:up` 更新到 range 内最新 SDK，`pnpm sdk:status` 查看当前模式。详见根 README「SDK 引入模式」。
- macOS 自带 bash 3.2 无 `mapfile`。

## Skill 路由表

| Skill | 适用场景 | 触发词示例 | 文件 |
| --- | --- | --- | --- |
| `uikit-component-authoring` | 新增/修改组件、模块、容器；props/emits/导出/命名规范；枚举字符串常量规范 | `写组件`、`加个组件`、`组件规范`、`emits 命名`、`Em 前缀`、`导出/resolver`、`常量`、`硬编码字符串`、`groupChat` | [.agent/skills/uikit-component-authoring/SKILL.md](.agent/skills/uikit-component-authoring/SKILL.md) |
| `uikit-styling-theming` | 改样式、主题、暗色、CSS 变量、颜色/圆角/动效 token | `改样式`、`主题`、`暗色`、`CSS 变量`、`颜色 token`、`unocss` | [.agent/skills/uikit-styling-theming/SKILL.md](.agent/skills/uikit-styling-theming/SKILL.md) |
| `uikit-store-composable` | 加/改 Pinia store、composable、状态管理、vueuse 用法 | `加 store`、`写 composable`、`加 hook`、`状态管理`、`用 vueuse` | [.agent/skills/uikit-store-composable/SKILL.md](.agent/skills/uikit-store-composable/SKILL.md) |
| `uikit-i18n-locale` | 加/改文案、多语言、翻译 key | `加文案`、`多语言`、`i18n`、`翻译`、`locale` | [.agent/skills/uikit-i18n-locale/SKILL.md](.agent/skills/uikit-i18n-locale/SKILL.md) |
| `uikit-tiptap-editor` | 改消息输入框、富文本、@提及、编辑器行为 | `改输入框`、`富文本`、`@提及`、`tiptap`、`编辑器` | [.agent/skills/uikit-tiptap-editor/SKILL.md](.agent/skills/uikit-tiptap-editor/SKILL.md) |
| `uikit-h5-adaptation` | H5/移动端适配：安全区、键盘、下拉刷新、长按、viewport | `H5 适配`、`安全区`、`键盘`、`下拉刷新`、`长按`、`viewport` | [.agent/skills/uikit-h5-adaptation/SKILL.md](.agent/skills/uikit-h5-adaptation/SKILL.md) |
| `uikit-contact-group-capabilities` | 单人与群组功能实现：联系人/好友/黑名单、群信息/成员/管理/公告/文件/名片 | `单人功能`、`联系人功能`、`群组功能`、`群管理`、`通讯录功能`、`address book` | [.agent/skills/uikit-contact-group-capabilities/SKILL.md](.agent/skills/uikit-contact-group-capabilities/SKILL.md) |
| `uikit-user-attribute-extraction` | 用户属性（昵称/头像/在线状态）提取：useUserInfo/useOwnUserInfo/usePresence、Avatar 复用、列表拆子组件 | `昵称`、`头像`、`用户属性`、`显示名`、`useUserInfo`、`头像不显示`、`sender name` | [.agent/skills/uikit-user-attribute-extraction/SKILL.md](.agent/skills/uikit-user-attribute-extraction/SKILL.md) |
| `websdk2-uikit-migration` | SDK 层（sdk/domain/adapter/event）架构与迁移 | `迁移 SDK`、`重写 uikit sdk`、`domain 层`、`websdk2 最佳实践` | [.agent/skills/websdk2-uikit-migration/SKILL.md](.agent/skills/websdk2-uikit-migration/SKILL.md) |
| `uikit-lint-governance` | 处理 eslint、lint 治理、非代码改动层决策、收尾提交 | `跑 lint`、`清 lint`、`改 eslint 配置`、`提交前检查` | [.agent/skills/uikit-lint-governance/SKILL.md](.agent/skills/uikit-lint-governance/SKILL.md) |
| `uikit-cell-contract` | Cell 类组件统一约束：列表项/导航项/操作行/信息行的视觉一致性 + EmCell 基础组件 | `cell`、`cell 组件`、`cell 规范`、`列表项`、`list item`、`视觉统一`、`导航项`、`操作行`、`信息行` | [.agent/skills/uikit-cell-contract/SKILL.md](.agent/skills/uikit-cell-contract/SKILL.md) |

路由规则：

- 先按触发词匹配对应 skill；命中任意 `.agent/skills/*` 后，先用一句短话显式提示命中的 skill 名，例如：`本次命中 skill: uikit-styling-theming`。
- 多个命中时按「先理解层（component/store/styling/i18n/tiptap/h5 对应域）→ SDK 层（migration）→ 收尾（lint-governance）」组合。
- 涉及具体待修问题时，先查根 `TECH-DEBT.md` 是否已登记，避免重复排查。

## 上下文入口

- 依赖/规范体系：本文件「Skill 路由表」+ `.agent/skills/*`
- 技术债与待修：根 [TECH-DEBT.md](TECH-DEBT.md)
- Electron + 本地 DB 持久化预研：根 [ELECTRON-PERSISTENCE-RESEARCH.md](ELECTRON-PERSISTENCE-RESEARCH.md)（对应 TECH-DEBT D85）
- 主题配置能力审查（字号/适老/密度）：根 [THEME-CAPABILITY-REVIEW.md](THEME-CAPABILITY-REVIEW.md)（对应 TECH-DEBT D86，关联 D3/D4/D12）
- Demo 开发者友好模式预研：根 [DEMO-DEV-MODE-RESEARCH.md](DEMO-DEV-MODE-RESEARCH.md)（对应 TECH-DEBT D87）
- 面性图标集接入方案预研（iconStyle 主题切换 + 选中态配对）：根 [ICON-STYLE-SYSTEM-RESEARCH.md](ICON-STYLE-SYSTEM-RESEARCH.md)（对应 TECH-DEBT D90）
- 核心包源码：`packages/uikit/src`（`components/` 原子、`modules/` 业务块、`containers/` 页面容器、`store/`、`composables/`、`sdk/`、`theme/`、`locale/`）
- 示例工程：`apps/demo`（vite alias 直连源码）、`apps/docs`（vitepress）
- 组件 story：`packages/uikit/src/**/*.story.vue`（Histoire）
