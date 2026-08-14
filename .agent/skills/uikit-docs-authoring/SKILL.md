# 文档站写作契约（apps/docs VitePress 结构 / demo 块 / API 自动生成）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-docs-authoring**。

## 触发词

- `docs` / `apps/docs` / `文档站` / `vitepress` / `文档`
- `组件文档` / `写文档` / `demo 块` / `vite-plugin-vitepress-demo` / `VuePlayground` /
  `在线演练场` / `@vue/repl` / `sync:vendor`
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

## 0. 主题定制与 UI 重构规范（antfu vitepress skill 落地）

> 规范来源：antfu/skills 仓库的 vitepress skill（tessl.io registry），
> 已按本项目现状精简落地。改文档站 UI 时先对照本节，避免破坏既有定制。

**导航（.vitepress/config.ts `nav`）**：
- 一级链接必须配 `activeMatch`（正则）保证子页高亮：组件 `^/components/`、
  指南 `^/guide/(?!theme|h5-adaptation|changelog)`（排除有独立 nav 项的页面）、
  首页 `^/$`、主题定制/H5 适配/更新日志各自精确段。
- 外链（GitHub）不配 activeMatch。

**品牌与字体（.vitepress/theme/style.css `:root`）**：
- 品牌色统一映射 UIKit 蓝 `hsl(203, 100%, x%)`：`--vp-c-brand-1/2/3` +
  `--vp-c-brand-soft`（light/dark 各一套），**不要引入第二色相**。
- 字体：`theme/index.ts` 必须 import `vitepress/theme-without-fonts`（移除默认
  Inter），`--vp-font-family-base` 用中文字体栈（PingFang SC / Hiragino /
  Microsoft YaHei），`--vp-font-family-mono` 用系统等宽栈。
- **标题 display 字体（设计感来源）**：本地托管得意黑 Smiley Sans
  （`public/fonts/smiley-sans.woff2`，OFL-1.1 开源可商用，来源
  atelier-anchor/smiley-sans v2.0.1，ttf 变体 1.15MB），经 `@font-face`
  （font-display: swap）定义为 `--vp-font-family-display`，仅应用于标题体系：
  `.VPHero .name/.text`、`.vp-doc h1/h2/h3`、`.VPNavBarTitle .title`、
  `.VPSidebarItem.level-0 .text`；**正文保持系统中文栈**（得意黑为斜体 display
  字体，不适合正文长文本）。新增标题字体时遵循：只影响标题、正文不动、字体文件
  本地托管不走 CDN。
- hero 定制变量：`--vp-home-hero-name-background`（名称渐变，同色系）、
  `--vp-home-hero-image-background-image` + `--vp-home-hero-image-filter`（logo 光晕）。

**暗色切换动效（.vitepress/theme/Layout.vue）**：
- Layout.vue `provide('toggle-appearance', ...)` 用 `document.startViewTransition`
  做以点击点为圆心的圆形扩散（skill 官方示例）；style.css 里
  `::view-transition-old(root), ::view-transition-new(root) { animation: none;
  mix-blend-mode: normal; }` 禁用默认白闪。**不要删 Layout.vue 的 provide**，
  否则暗色切换回归生硬。
- 注意：VitePress 1.6.x **不支持路由 view transition**（无 startViewTransition），
  不要写 `::view-transition-new(root)` 的路由动画（无效代码）。

**布局插槽（Layout.vue 内 `<Layout>` 模板）**：
- `#home-hero-info`：首页 hero 版本徽章（`__EASEMOB_UIKIT_VERSION__` 由
  vite.config.ts define 注入）；其余插槽见 vitepress 官方 extending-default-theme。

**其他 config 约定**：`editLink.pattern` 指向 GitHub
  `.../edit/main/apps/docs/:path`；`footer.copyright` 用
  `new Date().getFullYear()` 动态年份；local search 开启并配中文
  translations；sidebar 分组用 `collapsed: false`（默认展开、可折叠）。

## 1. 文档站结构（apps/docs）

- `package.json`：`dev` / `build` 前置 `pnpm sync:vendor`（node
  scripts/sync-vendor.mjs，同步 Playground vendor 静态资源）+ `preview`（vitepress
  原生）+ `gen:api`（node scripts/gen-api-docs.mjs）；依赖 vitepress ^1.6.4、  vite-plugin-vitepress-demo ^2.2.1、`@vue/repl` ^4.7.2（在线演练场）、
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

**在线代码演练场（VuePlayground）约定：**

- `VuePlayground`（`.vitepress/components/VuePlayground.vue`，已在 theme 注册为
  全局组件）基于 `@vue/repl` 4.x（vuejs.org Playground 同款）：页面内编辑 SFC
  源码，iframe 内实时编译渲染；props：`files`（`Record<string, string>`，键如
  `App.vue`，可多文件）/ `title` / `height` / `id`（本地持久化 key，同一页面
  多个演练场必须区分，不传回落到 title）；SSR 安全（onMounted 后动态 import
  repl，SSR 构建不炸），无需 ClientOnly 包装；
- **模板自包含约束**：预览 iframe 只认 import map 覆盖的模块——只能 import
  `@easemob/uikit` / `vue` / `pinia` / `easemob-websdk`（及 vue/server-renderer、
  @vue/compiler-sfc 等基础设施），import 其他包会模块解析失败白屏；
- 预览基于 **uikit dist 产物**（`public/vendor/easemob-uikit.js` + `uikit-theme.css`）
  而非源码——改 uikit 源码后需 `pnpm -F @easemob/uikit build` 再跑 `pnpm sync:vendor`
  （dev/build 已自动前置执行），playground 预览才会同步；`uikit-theme.css` 必须取
  `dist/theme/index.css`（含 :root 变量 + 全部组件样式），误用 `src/theme/index.css`
  会导致预览 iframe 组件无样式（docs 页面本体经 alias 直连 src 不受影响）；
- **编辑持久化**：编辑内容按 `uikit-playground:<id>:v1` 写入 localStorage
  （防抖 500ms），刷新/切换页面自动恢复；「重置代码」清除缓存并恢复初始模板。
  **改模板内容时必须升级 key 版本号（v1→v2）**，否则旧缓存污染新模板；
- **多文件约定**：有 mock 数据的演练场拆 `App.vue`（用户主编辑区，标注
  「可编辑配置」）+ `mock.ts`（mock 数据，标注「一般不需要修改」），Repl 原生
  渲染文件 tab，主文件恒为 `App.vue`；
- **全屏 / 新标签打开**：工具条提供「全屏」（容器 requestFullscreen）与
  「新标签打开」（`serialize()` → `public/playground.html#<code>`）。独立页
  由 `sync:vendor` 产物驱动（**vendor/repl.js 为 repl 本体 + codemirror 编辑器的
  单一合并 bundle**，共享 chunk 内联一份 —— 若分开打包，@vue/repl 的
  `injectKeyProps` Symbol 会在两个 bundle 内各求值一次，编辑器 inject 失配导致
  独立页白屏；import map 里 '@vue/repl' 与 '@vue/repl/codemirror-editor' 都指向
  同一 repl.js；编译器 import 是 'vue/compiler-sfc'，父页面 import map 需映射到
  vendor/compiler-sfc.js），直接访问无 hash 时展示内置欢迎模板；改独立页相关
  逻辑后需重跑 `sync:vendor` 并用 headless Chrome 实测（无 hash + 带 hash：
  serialize 为 zlib 压缩 base64，可用 node zlib 构造测试 hash）双链路；
- **演练场文件统一归入 `components/<page>/demo/playground/` 子目录**（普通 demo 平铺
  在 `demo/` 根，演练场一律进子目录，命名统一）：
  - `template.ts`：VuePlayground 在线代码演练场初始模板（导出 `xxxPlaygroundFiles`，
    **唯一演练场形态**——配置面板演练场已并入，原 config.vue 的配置项全部体现在
    模板的 config 对象「可编辑配置」区，改代码即改即看）
  - `mock.ts`：演练场 mock 数据（同页多演练场共用一个 mock.ts，导出多个函数）
  - `bubble.vue`：消息级能力演练场（仅 message-list 有，能力组合演示非配置面板）
  - 主题页模板例外：`.vitepress/components/playground-files/theme.ts`（全局 guide 位置）
  - md 文件加「## 在线代码演练场」小节（放 API 小节之前）+ 文件尾 `<script setup>`
  引入后以 `<VuePlayground :files="xxxPlaygroundFiles" title="…" id="…" />` 插入
  （沿用全局注册模式，无需改 sidebar/API 表）；Provider 不自带 pinia，
  VuePlayground 已在 previewOptions.customCode 注入 `app.use(createPinia())`，
  模板内无需重复；
- vendor 与 import map 的对应关系见 sync-vendor.mjs 头部注释与 VuePlayground.vue
  的 IMPORT_MAP；非自包含产物（pinia / easemob-websdk / @vue/repl）由脚本用
  esbuild 打包成单文件（依赖链内联），不要手动改 vendor 产物。

## 3. API 表格自动生成（scripts/gen-api-docs.mjs）

- 运行：`pnpm gen:api`（在 apps/docs 下）或 `cd apps/docs && pnpm gen:api`；
  幂等可重复执行，覆盖生成；
- **白名单**：`COMPONENTS` 数组硬编码 22 个原子组件（action-sheet 到 user-card），
  `MODULES` 数组覆盖业务容器（chat-container / conversation-container /
  group-container / message-list，映射到 `modules/*` 的组件文件），`CONTAINERS`
  数组覆盖顶级容器（uikit-provider，映射到 `containers/*`，复用 MODULES 生成逻辑）；
  新组件/容器要进 API 文档必须加入对应数组；
- 解析契约（对 `packages/uikit/src/components/<name>/<name>.vue` 的 `<script setup>`）：
  - Props：`export interface XxxProps` 的成员，类型取 TS 类型文本，说明取成员
    JSDoc **完整文本**（多行合并为 `<br>` 换行；嵌套小节标题的 blockquote 只取首行）；
    **内联对象类型成员（如 ProviderProps.theme）自动用 compactTypeText 去注释压缩**，
    外部 interface 引用保持类型原文；
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
- 演练场验证：`pnpm dev` 后打开含 VuePlayground 的页面，编辑代码看 iframe 实时
  更新、点「重置代码」恢复初始模板；改 uikit 源码后记得先 build 再 sync:vendor。
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
- 演练场模板只能 import import map 已覆盖的模块（@easemob/uikit / vue / pinia /
  easemob-websdk），否则 iframe 模块解析失败白屏。

**软约定：**

- `<demo>` 块 title / desc 必填，一个 demo 只演示一个主题。
- 组件页结构固定：简介 → 使用方式 → 功能小节（demo 块）→ API（@include）。
- 改 uikit 源码后必须 `pnpm -F @easemob/uikit build` + `pnpm sync:vendor`，
  演练场预览才会同步到新产物。
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
- ❌ 演练场模板 import 未映射的第三方包——iframe 内 "Failed to resolve module
  specifier"，预览白屏。
- ❌ 改 uikit 源码后只重跑 dev 不 build/sync:vendor——演练场仍预览旧 dist 产物。
- ❌ 改演练场模板内容却不升级持久化 key 版本号（`<id>:v1`→`<id>:v2`）——用户
  浏览器 localStorage 里的旧代码继续覆盖新模板，「重置代码」也救不回来。
- ❌ 同一页面多个 VuePlayground 不传互不相同的 `id`——持久化 key 冲突，互相覆盖。
- ❌ 改动独立页（public/playground.html / sync-vendor 的 repl 产物）后不重跑
  `sync:vendor` 且不做浏览器实测——新标签打开链路断裂（白屏 / 编译失败）。
- ❌ API 表格单元格裸写含 `{ ... }` 的匿名对象文本——markdown-it-attrs 会把
  `payload: { type: string }` 误判为元素属性块并注入相邻标签，docs build 报
  `Duplicate attribute`；gen 脚本对 Events 参数列含 `{` 的文本已自动包反引号规避，
  手写 md 段落同样遵循此规则（包反引号或转义）。
