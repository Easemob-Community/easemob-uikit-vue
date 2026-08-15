# AGENTS 规则（easemob-uikit-vue）

本文件是仓库协作规则与 skill 路由入口。`easemob-uikit-vue` 是基于 `easemob-websdk`(websdk2 / SDK5) 的 Vue3 UIKit（pnpm workspace，核心包 `@easemob/uikit-im`）。

## 高优先级规则

- 协作沟通、计划、变更说明默认**中文**；对外组件 API / props / emits 的注释与文档尽量中英双语。
- 修改后**必须先验证再提交**：验证门禁是**类型检查 + 构建**，不是 lint 全绿。
  - 类型检查：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit`（0 错误）
  - 构建：`pnpm -F @easemob/uikit-im build`（= `vite build && vue-tsc --emitDeclarationOnly`，约 9s）
  - demo 类型检查：`cd apps/demo && pnpm exec vue-tsc --noEmit`
- **版本号同步**：`packages/uikit-im/package.json` 的 `version` 必须与根 `CHANGELOG.md` 最新版本段一致；发版/改版本号后提交前跑 `pnpm changelog:check`（唯一版本数据源是根 CHANGELOG，文档站 changelog 页经 `@include` 引用，禁止手写版本段）。
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
- **demo 运行时走 vite alias `@easemob/uikit-im` → `packages/uikit-im/src`**（源码），改 src 刷新即生效，无需重建 dist；但 demo 的 `vue-tsc` 解析的是已构建 dist 类型，改公开 API 后要重建 dist 才能让 demo 类型检查一致。demo 当前为 workspace 源码直连模式（tgz 验证模式已于 1.9.0 收回，切换细节见 skill `uikit-demo-development`）。
- **SDK 双引入模式**：`easemob-websdk` 子包依赖声明恒为 `^5.0.0`（生产/发布，跟随 5.x 正式版与 beta 线）；本地 tgz 联调用 `pnpm sdk:use-tgz` / `pnpm sdk:use-npm` 切换（根 `package.json` 的 `pnpm.overrides` 指向根目录 `easemob-websdk-5.0.0.tgz`，切换后需 `pnpm install`）；`pnpm sdk:up` 更新到 range 内最新 SDK，`pnpm sdk:status` 查看当前模式。详见根 README「SDK 引入模式」与 skill `uikit-release-build`。
- macOS 自带 bash 3.2 无 `mapfile`。

## Skill 路由表

| Skill                              | 适用场景                                                                                              | 触发词示例                                                                                                                           | 文件                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `uikit-component-authoring`        | 新增/修改组件、模块、容器；props/emits/导出/命名规范；枚举字符串常量规范                              | `写组件`、`加个组件`、`组件规范`、`emits 命名`、`Em 前缀`、`导出/resolver`、`常量`、`硬编码字符串`、`groupChat`                      | [.agent/skills/uikit-component-authoring/SKILL.md](.agent/skills/uikit-component-authoring/SKILL.md)               |
| `uikit-styling-theming`            | 改样式、主题、暗色、CSS 变量、颜色/圆角/动效 token                                                    | `改样式`、`主题`、`暗色`、`CSS 变量`、`颜色 token`、`unocss`                                                                         | [.agent/skills/uikit-styling-theming/SKILL.md](.agent/skills/uikit-styling-theming/SKILL.md)                       |
| `uikit-store-composable`           | 加/改 Pinia store、composable、状态管理、vueuse 用法                                                  | `加 store`、`写 composable`、`加 hook`、`状态管理`、`用 vueuse`                                                                      | [.agent/skills/uikit-store-composable/SKILL.md](.agent/skills/uikit-store-composable/SKILL.md)                     |
| `uikit-i18n-locale`                | 加/改文案、多语言、翻译 key                                                                           | `加文案`、`多语言`、`i18n`、`翻译`、`locale`                                                                                         | [.agent/skills/uikit-i18n-locale/SKILL.md](.agent/skills/uikit-i18n-locale/SKILL.md)                               |
| `uikit-tiptap-editor`              | 改消息输入框、富文本、@提及、编辑器行为                                                               | `改输入框`、`富文本`、`@提及`、`tiptap`、`编辑器`                                                                                    | [.agent/skills/uikit-tiptap-editor/SKILL.md](.agent/skills/uikit-tiptap-editor/SKILL.md)                           |
| `uikit-h5-adaptation`              | H5/移动端适配：安全区、键盘、下拉刷新、长按、viewport                                                 | `H5 适配`、`安全区`、`键盘`、`下拉刷新`、`长按`、`viewport`                                                                          | [.agent/skills/uikit-h5-adaptation/SKILL.md](.agent/skills/uikit-h5-adaptation/SKILL.md)                           |
| `uikit-contact-group-capabilities` | 单人与群组功能实现：联系人/好友/黑名单、群信息/成员/管理/公告/文件/名片                               | `单人功能`、`联系人功能`、`群组功能`、`群管理`、`通讯录功能`、`address book`                                                         | [.agent/skills/uikit-contact-group-capabilities/SKILL.md](.agent/skills/uikit-contact-group-capabilities/SKILL.md) |
| `uikit-user-attribute-extraction`  | 用户属性（昵称/头像/在线状态）提取：useUserInfo/useOwnUserInfo/usePresence、Avatar 复用、列表拆子组件 | `昵称`、`头像`、`用户属性`、`显示名`、`useUserInfo`、`头像不显示`、`sender name`                                                     | [.agent/skills/uikit-user-attribute-extraction/SKILL.md](.agent/skills/uikit-user-attribute-extraction/SKILL.md)   |
| `uikit-message-rendering`          | 消息渲染链路：气泡外壳/各类型气泡/图片三级展示/语音/合并消息/状态回执                                 | `改消息渲染`、`消息气泡`、`图片预览`、`语音消息`、`@提及高亮`、`消息翻译`、`合并消息`、`已读回执`                                    | [.agent/skills/uikit-message-rendering/SKILL.md](.agent/skills/uikit-message-rendering/SKILL.md)                   |
| `uikit-chat-interactions`          | 消息交互：操作菜单/引用/转发/多选/编辑/翻译/撤回/置顶/搜索/群已读                                     | `消息操作`、`长按菜单`、`右键菜单`、`引用`、`回复消息`、`转发`、`合并转发`、`多选`、`编辑消息`、`置顶消息`、`消息搜索`               | [.agent/skills/uikit-chat-interactions/SKILL.md](.agent/skills/uikit-chat-interactions/SKILL.md)                   |
| `uikit-chat-plugin-tabs`           | 插件机制与会话分栏：useChatPlugin 扩展点/插槽接管/tabs 定制                                           | `插件`、`useChatPlugin`、`扩展点`、`会话分栏`、`conversation-tabs`、`toolbar-extra`、`message-custom`、`自定义消息`、`插槽`          | [.agent/skills/uikit-chat-plugin-tabs/SKILL.md](.agent/skills/uikit-chat-plugin-tabs/SKILL.md)                     |
| `uikit-provider-config`            | Provider 配置：features 开关/dataSource 接管/延迟初始化/token 过期/主题 prop                          | `provider`、`UIKitProvider`、`features`、`enableContact`、`enablePresence`、`dataSource`、`autoInit`、`onTokenExpired`、`theme prop` | [.agent/skills/uikit-provider-config/SKILL.md](.agent/skills/uikit-provider-config/SKILL.md)                       |
| `uikit-notification`               | 通知系统：页内弹窗/浏览器通知/免打扰/触发模式/权限申请                                                | `通知`、`useNotification`、`notifyBrowser`、`免打扰`、`triggerMode`、`通知权限`、`EmNotificationContainer`                           | [.agent/skills/uikit-notification/SKILL.md](.agent/skills/uikit-notification/SKILL.md)                             |
| `websdk2-uikit-migration`          | SDK 层（sdk/domain/adapter/event）架构与迁移                                                          | `迁移 SDK`、`重写 uikit sdk`、`domain 层`、`websdk2 最佳实践`                                                                        | [.agent/skills/websdk2-uikit-migration/SKILL.md](.agent/skills/websdk2-uikit-migration/SKILL.md)                   |
| `uikit-demo-development`           | demo 应用开发：源码直连/tgz 模式切换/登录/设置面板/演示数据注入/Dev Hints                             | `demo`、`apps/demo`、`登录页`、`自动登录`、`useDemoSettings`、`mock 数据`、`拼音 adapter`、`Dev Hints`、`chatConfig`、`tgz 联调`     | [.agent/skills/uikit-demo-development/SKILL.md](.agent/skills/uikit-demo-development/SKILL.md)                     |
| `uikit-docs-authoring`             | 文档站写作：VitePress 组件页/demo 块/gen:api API 表格/sidebar 登记                                    | `docs`、`文档站`、`vitepress`、`组件文档`、`demo 块`、`gen:api`、`@include`、`sidebar`                                               | [.agent/skills/uikit-docs-authoring/SKILL.md](.agent/skills/uikit-docs-authoring/SKILL.md)                         |
| `uikit-release-build`              | 打包发布：构建链路/产物结构/SDK 双引入模式/版本注入/图标引用校验                                      | `构建`、`vite build`、`vue-tsc`、`发布`、`打包`、`sdk:use-tgz`、`resolver`、`auto-imports`、`版本注入`                               | [.agent/skills/uikit-release-build/SKILL.md](.agent/skills/uikit-release-build/SKILL.md)                           |
| `uikit-lint-governance`            | 处理 eslint、lint 治理、非代码改动层决策、收尾提交                                                    | `跑 lint`、`清 lint`、`改 eslint 配置`、`提交前检查`                                                                                 | [.agent/skills/uikit-lint-governance/SKILL.md](.agent/skills/uikit-lint-governance/SKILL.md)                       |
| `uikit-cell-contract`              | Cell 类组件统一约束：列表项/导航项/操作行/信息行的视觉一致性 + EmCell 基础组件                        | `cell`、`cell 组件`、`cell 规范`、`列表项`、`list item`、`视觉统一`、`导航项`、`操作行`、`信息行`                                    | [.agent/skills/uikit-cell-contract/SKILL.md](.agent/skills/uikit-cell-contract/SKILL.md)                           |
| uikit-skill-authoring              | 新增/补录 skill：判定时机/结构/命名/格式约束/路由表登记/验证                                          | `新增 skill`、`加 skill`、`skill 规范`、`技能编写`、`什么时候加`、`路由表`、`SKILL.md`                                               | [.agent/skills/uikit-skill-authoring/SKILL.md](.agent/skills/uikit-skill-authoring/SKILL.md)                       |

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
- 流式消息接入设计执行计划（内核薄 + 插件厚，AI/markdown 走插件）：根 [STREAMING-MESSAGE-PLAN.md](STREAMING-MESSAGE-PLAN.md)（对应 TECH-DEBT D95）
- 聊天室 UIKit 设计规划（独立场景包 `@easemob/uikit-chatroom` + 抽共享基座 `@easemob/uikit-core` + 场景预设变种，H5-first）：根 [CHATROOM-UIKIT-DESIGN.md](CHATROOM-UIKIT-DESIGN.md)（对应 TECH-DEBT D97，按时序 `@easemob/uikit-im` 1.x 开发完后启动）
- 消费者验证清单（独立 Vue3 工程验证「好不好用」，发版前产物自检 + 下周 Demo 逐项打勾）：根 [CONSUMER-VALIDATION-CHECKLIST.md](CONSUMER-VALIDATION-CHECKLIST.md)
- 核心包源码：`packages/uikit-im/src`（`components/` 原子、`modules/` 业务块、`containers/` 页面容器、`store/`、`composables/`、`sdk/`、`theme/`、`locale/`）
- 示例工程：`apps/demo`（vite alias 直连源码）、`apps/docs`（vitepress）
- 组件 story：`packages/uikit-im/src/**/*.story.vue`（Histoire）
- 集成侧产物（面向下游接入者，与内部 `.agent/skills/*` 相互独立）：Skills 包 `integrations/skills/`（入口 `SKILL.md`，同步脚本 `scripts/gen-skill.mjs`）+ MCP 服务 `packages/mcp/`（`@easemob/uikit-mcp`，stdio 传输，数据源 `apps/docs`，构建前跑 `scripts/sync-docs.mjs`）
