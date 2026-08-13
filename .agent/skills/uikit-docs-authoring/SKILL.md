# 文档站写作契约（apps/docs VitePress 结构 / demo 块 / API 自动生成）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-docs-authoring**。

## 触发词

- `docs` / `apps/docs` / `文档站` / `vitepress` / `文档`
- `组件文档` / `写文档` / `demo 块` / `vite-plugin-vitepress-demo`
- `gen:api` / `gen-api-docs` / `API 文档` / `@include`
- `sidebar` / `导航` / `组件目录` / `IconGallery`
- `快速开始` / `主题定制` / `H5 适配` / `更新日志`（guide 系列页面）

## 目标

文档站是 VitePress 工程，组件页由「手写 markdown + demo 块 + 自动生成 API 表格」三部分
拼装。本 skill 记录**目录结构**、**组件页写作规范**、**API 自动生成机制**与**构建细节**
的真实契约，避免以下翻车：

1. 新 demo 文件放错目录（`components/x.md` 的 demo 必须放 `components/x/demo/`）；
2. 改完组件 props/emits 不跑 `pnpm gen:api`，API 表格过期；
3. 手动编辑 `.vitepress/gen/*.md`（生成产物，下次 gen 覆盖）；
4. 新增组件页后忘记在 `.vitepress/config.ts` 的 sidebar 登记；
5. 不了解 rewriteDemoSrc 插件，以为 demo 路径规则与标准 vitepress-demo 一致。

## 1. 文档站结构（apps/docs）

- `package.json`：`dev` / `build` / `preview`（vitepress 原生）+ `gen:api`（node
  scripts/gen-api-docs.mjs）；依赖 vitepress ^1.6.4、vite-plugin-vitepress-demo ^2.2.1、
  `@vue/compiler-sfc` + typescript（gen 脚本的解析引擎）；`@easemob/uikit` 为
  `workspace:*`；
- `index.md`：home 布局（hero + features），hero actions 指向快速开始与组件预览；
- `guide/`：quickstart / theme / icons / h5-adaptation / advanced / demo-phase1-plan /
  changelog（更新日志，与根 CHANGELOG.md 不同，是站点展示版）；
- `components/`：每个组件一对——`<name>.md`（手写正文）+ `<name>/demo/*.vue`（示例）;
  业务容器（conversation-container / chat-container / contact-container /
  address-book-container / group-container / add-contact-modal / create-group-modal）
  大多只有 md，无 demo 目录（容器依赖 SDK 登录态，不便于静态演示）；
  例外：`message-list.md` 有 demo 目录——消息列表演练场用 mock 注入免登录渲染
  （见 §2 交互式 demo 约定），新容器页若采用同模式可按需建 demo 目录；
- `.vitepress/config.ts`：sidebar 结构（指南 + 组件四组分类：基础 10 / 反馈 8 /
  数据展示 4 / 业务模块 8）、nav、`ignoreDeadLinks: [/packages\/uikit\//]`
  （icons.md 引用仓库内源码文件，跳过死链校验）；
- `.vitepress/components/`：站点级自定义组件（如 IconGallery.vue 图标画廊）；
- `.vitepress/gen/`：gen:api 生成产物目录，提交但**禁止手改**。

## 2. 组件文档写作规范（components/<name>.md）

标准页面结构（参考 button.md）：

- 一级标题 `# Button 按钮`（组件名 + 中文展示名）；
- 开头一段简介（一句话说清用途）；
- `## 使用方式`：EmXxx 命名导出说明 + 一个最小 `vue` 代码块；
- 若干功能小节：每节一个 `<demo>` 块，覆盖组件主要能力（语义/尺寸/状态/事件等）；
- 结尾 `## API` + `<!-- @include: ../.vitepress/gen/<name>.md -->` 引用生成的 API 表格。

`<demo>` 块写法（vite-plugin-vitepress-demo 语法）：

```
<demo src="./demo/types.vue" title="语义类型" desc="通过 type 属性切换六种语义。" />
```

- `src` 相对 md 文件位置写 `./demo/x.vue`（**不要**写成 `./<name>/demo/x.vue`，
  rewriteDemoSrc 插件会自动重写，见 §4）；
- `title` 小节标题、`desc` 一句话说明，两者都必填，保证列表页/目录可读；
- demo 源文件（`<name>/demo/*.vue`）**必须能独立运行**：文档站构建时会真实编译渲染
  它们，import 的组件/API 需在源码或全局注册中可用；
- demo 文件命名按场景（types.vue / sizes.vue / states.vue / events.vue），
  一个 demo 只演示一个主题，别把多个能力塞进一个文件。

**交互式 demo（配置演练场）约定：**

- `DocsConfigPanel`（`.vitepress/components/DocsConfigPanel.vue`，已在 theme 注册为
  全局组件）用声明式 `configItems` 数组（label / key / tip / type: select|boolean|number /
  options / min / max）渲染互斥选项组 / 布尔开关 / 数字输入，v-model 回写一个
  reactive 配置对象——避免每个演练场手写一堆 checkbox/按钮样板；
- mock 免登录注入模式：`EmUIKitProvider(:auto-init="false")` 包裹 +
  `useConversationStore().setConversationList/setCurrentConversationId` +
  `useMessageStore().messageMap[id] = mock 消息`（参考
  `packages/uikit/src/modules/chat/message-list/message-list.story.vue`）；
  共享 mock 数据放 `components/<name>/demo/mock-*.ts` 供多个 demo 复用；
- demo 经 `<demo>` 块的 ClientOnly 包裹仅在客户端执行；若未来脱离 ClientOnly
  直引 demo 源文件，mock 注入前需 `typeof window` 守卫（避免触碰 SSR）。

## 3. API 表格自动生成（scripts/gen-api-docs.mjs）

- 运行：`pnpm gen:api`（在 apps/docs 下）或 `cd apps/docs && pnpm gen:api`；
  幂等可重复执行，覆盖生成；
- **白名单**：`COMPONENTS` 数组硬编码 22 个原子组件（action-sheet 到 user-card），
  `MODULES` 数组覆盖业务容器（chat-container / conversation-container /
  group-container / message-list，映射到 `modules/*` 的组件文件）；新组件/容器要进
  API 文档必须加入对应数组；
- 解析契约（对 `packages/uikit/src/components/<name>/<name>.vue` 的 `<script setup>`）：
  - Props：`export interface XxxProps` 的成员，类型取 TS 类型文本，说明取成员
    JSDoc **完整文本**（多行合并为 `<br>` 换行；嵌套小节标题的 blockquote 只取首行）；
  - 默认值：`withDefaults(defineProps<XxxProps>(), {...})` 第二个参数；
  - Events：`export interface XxxEmits`（函数签名式）或 `defineEmits<{...}>()` 内联
    类型字面量，事件名取第一个字符串字面量参数，负载取其余参数类型；
  - Slots：模板中 `<slot name="...">` 具名插槽列表（无说明列）；
- 输出：`.vitepress/gen/<name>.md`（表头 + 对齐表格），组件页用 `@include` 引入；
  业务容器输出在顶层 `### Props` 之外，还会为嵌套配置生成 `#### config.xxx` 子小节
  （嵌套类型递归展开：深度上限 3、按类型名去重、函数/联合/泛型只显示类型原文），
  `MODULES` 条目可用 `nestedOnly` 限定只展开某个子树（如 message-list 只展开
  `config.messageList`，其余 ChatConfig 配置对该组件无效）；
- **组件侧联动**：给 props/emits 成员写 JSDoc，就是写文档——改 API 后
  记得重跑 gen:api，否则表格与类型脱节；
- 解析失败（语法错误/无 script setup）会 warn 跳过并计入成功率，不会中断整体。

## 4. 构建细节（vite.config.ts / config.ts）

- **rewriteDemoSrc 插件**（本项目特有）：vite-plugin-vitepress-demo 以 md 所在目录
  解析 `<demo src>`，`components/button.md` 里的 `./demo/x.vue` 会被解析成
  `components/demo/x.vue`，与真实位置 `components/button/demo/` 对不上。该插件
  `enforce: 'pre'` 且注册在 vitepressDemo **之前**（数组顺序即执行顺序），把
  `src="./demo/` 重写为 `src="./<name>/demo/`（仅当目标目录真实存在）；
- **alias**：`@easemob/uikit` → `packages/uikit/src`（文档站 demo 直接编译源码，
  与 demo 应用源码模式同思路；注意这里没有 theme 子路径 alias，demo 内不要
  import `@easemob/uikit/theme`，组件样式由 `.vue` 自带）；
- **版本注入**：`define.__EASEMOB_UIKIT_VERSION__` 构建期读 packages/uikit 的
  package.json（首页徽章/页脚 copyright 使用）；
- sidebar / nav 维护：新增组件页必须在 `.vitepress/config.ts` 按分类登记
  （基础/反馈/数据展示/业务模块），新增 guide 页面在 `/guide/` 分组登记；
- 构建产物在 `.vitepress/dist`，仓库根 gitignore 覆盖。

## 5. 特殊页面与约定

- `index.md`：`layout: home`，hero 的 text/tagline/actions + features 六宫格；
  首页 features 数字（如「18 个原子组件」）随组件数量漂移，改组件时顺手核对；
- `guide/icons.md`：引用 `packages/uikit/src` 下源码文件作为仓库内链接，因此
  config.ts 配了 `ignoreDeadLinks` 跳过校验——新增仓库内链接无需再改配置；
- `.vitepress/components/IconGallery.vue`：图标画廊（图标名/分类/预览），
  新增图标集时同步它的数据源；
- `guide/changelog.md`：**单一数据源**——整页只保留说明 + `<!-- @include: ../../../CHANGELOG.md -->`，内容自动引用根 `CHANGELOG.md`，禁止在站点页手写版本段（曾发生双写分叉：1.5.0/1.5.1 只进站点、根 CHANGELOG 停在 1.4.0、package.json 停在 1.3.1）；改根 CHANGELOG 后 `cd apps/docs && pnpm build` 验证渲染与死链；
- 文档站无多语言（lang 固定 zh-CN），文案只写中文（组件 API 注释保持中英双语，
  那是组件侧的事）。

## 6. 常用验证

- 本地预览：`cd apps/docs && pnpm dev`（改 md/demo 热更）；
- 构建验证：`cd apps/docs && pnpm build`（会真实编译所有 demo，语法/引用错误在此暴露；
  死链校验由 ignoreDeadLinks 白名单豁免仓库内路径）；
- API 表格校验：改组件后 `pnpm gen:api` 重跑，diff `.vitepress/gen/` 检查是否
  符合预期（表格对齐由脚本保证，手改必被覆盖）。

## 硬规则 vs 软约定

**硬规则：**

- 组件 demo 文件必须放 `components/<name>/demo/`，md 内 src 写 `./demo/x.vue`。
- API 表格一律由 gen:api 生成，禁止手改 `.vitepress/gen/*.md`。
- 改组件公开 API 后必须重跑 `pnpm gen:api`（JSDoc 即文档）。
- 新组件进 API 文档必须加入 gen-api-docs.mjs 的白名单（原子组件 COMPONENTS，
  业务容器 MODULES）。
- 新页面必须登记到 `.vitepress/config.ts` 的 sidebar（组件按分类、指南按分组）。
- demo 源文件必须能独立编译运行（docs build 会真实渲染）。

**软约定：**

- `<demo>` 块 title / desc 必填，一个 demo 只演示一个主题。
- 组件页结构固定：简介 → 使用方式 → 功能小节（demo 块）→ API（@include）。
- 文档站只写中文；组件注释中英双语由组件侧负责。

## 已知漂移（改到相关文件时注意）

- sidebar 组件数量（基础 10 / 反馈 8 / 数据展示 4 / 业务模块 8）与首页 features
  「18 个原子组件」是静态文案，随组件增减同步更新；message-list 属业务模块
  （非原子组件），登记时不影响 features 数字。
- gen-api-docs.mjs 白名单已覆盖原子组件（COMPONENTS）与业务容器（MODULES）；
  chat-container / conversation-container / group-container / message-list 的
  API 段落由生成器维护（`@include`），改动容器 props 后重跑 gen:api 即可，不再手写。
  未接入的容器（contact-container / address-book-container / add-contact-modal /
  create-group-modal）仍是手写段落；注意 contact-container.md 描述的是尚未实现的
  EmContactContainer（通讯录聚合容器），不要错接 contact-list.vue 生成。
- 文档站 alias 没有 `@easemob/uikit/theme` 子路径（与 demo 应用不同），demo 里
  不要 import theme 子路径。

## 反面清单

- ❌ demo 文件放错目录（`components/demo/` 而非 `components/<name>/demo/`）——
  rewriteDemoSrc 找不到目录时不重写，demo 静默不渲染。
- ❌ 改 props/emits 后不跑 gen:api——API 表格与真实类型脱节。
- ❌ 手改 `.vitepress/gen/*.md`——下次 gen:api 被覆盖，且 diff 污染。
- ❌ 新组件只写 md 不登记 sidebar——页面 404 或导航缺失。
- ❌ demo 里 import `@easemob/uikit/theme`——文档站 alias 无此子路径，构建失败。
- ❌ 新组件不加入 gen-api-docs 白名单——API 表格永远缺失。
- ❌ 只 `pnpm dev` 不 `pnpm build`——demo 编译错误（如类型/引用）在 dev 下可能
  被吞掉，build 才是文档站门禁。
- ❌ API 表格单元格裸写含 `{ ... }` 的匿名对象文本——markdown-it-attrs 会把
  `payload: { type: string }` 误判为元素属性块并注入相邻标签，docs build 报
  `Duplicate attribute`；gen 脚本对 Events 参数列含 `{` 的文本已自动包反引号规避，
  手写 md 段落同样遵循此规则（包反引号或转义）。
