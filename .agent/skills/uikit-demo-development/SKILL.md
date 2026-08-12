# Demo 应用开发契约（apps/demo 结构 / 源码直连模式 / 设置面板 / Dev Hints）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-demo-development**。

## 触发词

- `demo` / `apps/demo` / `demo 应用` / `演示工程`
- `登录页` / `login-page` / `自动登录` / `localStorage 记忆`
- `设置面板` / `设置抽屉` / `demo-settings` / `useDemoSettings`
- `mock 数据` / `模拟会话` / `模拟联系人` / `拼音 adapter` / `setPinyinAdapter`
- `Dev Hints` / `dev-hints` / `开发者提示`
- `chatConfig` / `演示自定义消息` / `名片消息` / `快捷回复`
- `源码模式` / `tgz 联调` / `vite alias`

## 目标

demo 是 UIKit 的「演示 + 联调 + 业务接入参考」三合一工程。本 skill 记录 demo 的**运行模式（源码直连 vs tgz 产物）**、**应用装配**（Provider / 登录 / 布局）、**设置面板状态单例**、
**演示数据注入**与 **Dev Hints 注册表**的真实契约，避免以下翻车：

1. 在 tgz 联调模式下改 `packages/uikit/src` 以为刷新即生效（源码模式才有 alias）；
2. 恢复源码模式时只配了一条 alias（theme 子路径必须排在前面）；
3. 新设置状态不放进 `useDemoSettings` 单例，导致面板与页面状态分叉；
4. 业务 key 只加了 zh-CN 忘记加 en，切换语言后 key 裸奔；
5. Dev Hints 新增条目引用行号（应引用文件路径，随代码漂移）。

## 1. 运行模式：源码直连 vs tgz 产物（vite.config.ts）

- **源码模式（默认）**：`resolve.alias` 两条，**theme 子路径必须排在前面**：

```
alias: [
  { find: '@easemob/uikit/theme', replacement: resolve(__dirname, '../../packages/uikit/dist/theme/index.css') },
  { find: '@easemob/uikit', replacement: resolve(__dirname, '../../packages/uikit/src') },
],
```

- 源码模式下改 `packages/uikit/src` 刷新即生效，无需重建 dist；组件样式由 `.vue`
  `<style>` 提供（产物模式由主题 css 提供，main.ts 两模式均引入 `@easemob/uikit/theme`）；
- **tgz 临时验证模式（2026-08-12 起）**：alias 被注释，`@easemob/uikit` 从 node_modules
  解析 `file:../../easemob-uikit-1.3.1.tgz` 安装产物。此模式下**改 src 不生效**，需
  `pnpm -F @easemob/uikit build` 重新打包并重新安装 tgz 依赖（或直接恢复源码模式）；
- **demo 的 `vue-tsc` 始终解析 dist 类型**（非源码）：改公开 API（props/emits/导出）
  后必须重建 dist，否则 demo 类型检查与运行时不一致；
- `define` 注入 `__EASEMOB_SDK_VERSION__` / `__EASEMOB_UIKIT_VERSION__`（构建期读
  sdk 与 uikit 的 package.json，与主库构建同源逻辑）；
- unplugin-vue-components + unplugin-auto-import（`dts: true`）：demo 内组件/API
  免显式 import，`components.d.ts` / `auto-imports.d.ts` 自动生成；
- 脚本：`dev` = vite / `build` = `vue-tsc && vite build` / `preview` = vite preview。

## 2. 应用装配与多语言（main.ts）

- `app.use(createPinia())` + `app.use(UIKit)`（UIKit 是带 install 的插件）；
- **业务多语言 key 用 `mergeLocaleMessages(locale, dict)` 扩展**，`zh-CN` 与 `en`
  必须成对补齐（demo 用 `demo.card.*`、`demo.quickReply.*` 前缀命名空间）；
- `useLocale()` 的 `t()` 在业务组件中查这些 key；key 缺失时回退 key 本身。

## 3. Provider 装配与登录（app.vue / login-page.vue）

- `EmUIKitProvider` 持有 6 个开关（enable-contact / enable-blocklist / enable-presence /
  enable-draft / enable-at-me / enable-typing）+ `data-source` + `h5`，全部 ref 双向绑定，
  运行时切换即生效（features 是惰性 getter，见 uikit-provider-config）；
- **`useClient()` 必须在 Provider 内使用**：AppContent 以内部组件（render 函数）形式
  包在 Provider 里，演示标准业务接线；Provider 外调用会 throw；
- 登录两步：`init({ appKey, apiUrl?, debug? })` → `login({ user, accessToken | password })`
  （init 只做 SDK 初始化，不会自动 login）；
- 登录配置记忆到 `localStorage['uikit_demo_login_config']`（appKey/apiUrl/debug/user/
  mode + 凭证），onMounted 检测到历史配置自动登录（token 或密码模式）；
- 预设账号 `demoPresetUsers`（hfp / pfh，token 模式）一键填入，供联调使用；
- `data-source` 最小示例：只覆盖 `fetchContacts()` 返回 `{ list, cursor?, hasMore? }`，
  演示业务接管好友列表（完整契约见 uikit-provider-config）。

## 4. 页面编排（demo-page.vue）

- **PC 三栏**：NavSidebar（左侧导航）→ EmResizable 中间栏（会话/联系人，宽度 240~480，
  持久化到 UIKIT 内部配置存储，key 由 `createUIKitStorageKey(appKey, userId, 'layout_sidebar_width')`
  生成）→ 主区（详情 / EmChatContainer）；
- **H5 单栏栈式**：`h5Page` 三态 `'list' | 'chat' | 'detail'`，靠 `useViewport().isMobile`
  切换，选中会话自动跳 chat 页，返回时 `setCurrentConversationId(null)`；
- **chatConfig** 由设置状态实时组装（`computed`），分组：`header`（showAvatar）/
  `groupReadReceipt`（enabled + maxGroupSize）/ `groupManagement`（muteAll/muteList/
  blocklist/allowlist/sharedFiles/joinRequests）/ `input`（mode/style/features/autoFocus/
  showSendButton/stickerPacks/焦点色/光标色/选中色/maxLength）/ `messageList`（showTime/
  search/messageStatus）；
- **插槽接管**：`#toolbar-extra`（快捷回复面板 toggle）、`#message-custom`（自定义消息
  渲染，demo 用 event=userCard 判定名片，未识别回落 EmCustomMessage）；
- **扩展消息发送**：`useMessageSend().sendCustomMessage(event, params)`，params 携带
  uid/nickname/avatar；
- **通知联动**：watch 5 个通知设置 ref → `configureNotification({...})`（Provider 已按
  prop 接线，面板改动实时生效，见 uikit-notification）；
- **会话分栏接管**：`useConversationTabs({ tabs, activeTab })` 返回 hook 状态，配合
  `#tabs` 插槽自绘（接管模式）；普通模式直接传 `:tabs` / `:active-tab` / 监听
  `@active-tab-change`；
- **mock 会话兜底**：登录后会话列表为空且未同步时注入一组 mock 会话（含 @我 标记
  `setAtMe`），见到真实列表即停止——演示分栏效果又不污染真实数据。

## 5. 设置状态单例（use-demo-settings.ts）

- **模块级单例**：`createDemoSettings()` + 全局缓存复用——设置面板（components/settings/）
  与 demo-page 必须共享同一份状态，否则面板修改不生效；新状态一律加进这里；
- 设置值全部 localStorage 记忆，key 用 `demo-` 前缀（如 `demo-dev-hints-enabled`、
  `demo-keyboard-shortcuts-enabled`），值约定 `'on'` / `'off'`；
- 演示数据注入 API（业务方例程）：
  - `useConversation().setLocalConversationList(list)`——注入 1000 条模拟会话；
  - `useContactStore().setContactList(list)`——注入中英文混杂联系人；
  - `setPinyinAdapter(adapter)` / `setPinyinAdapter(null)`——拼音搜索适配器开关
    （pinyin-pro 实现：pinyin + initials + firstLetter，非 A-Z 首字母回落 `'#'`）；
  - `setKeyboardShortcutsEnabled(bool)`——UIKIT 全局快捷键开关（ESC 关弹层等）；
- `DEFAULT_CONVERSATION_TABS` 从 `@easemob/uikit` 导入，tabs 增删/排序/预设（仅单聊 /
  仅群组 / 恢复默认）都有对应动作函数；
- `demoStickerPacks`：GIF 表情包示例（EmojiStickerPack[]），验证 sticker 发送链路。

## 6. Dev Hints 开发者提示（dev-hints/）

- **声明式注册表**（registry.ts）：`DEV_HINT_REGISTRY` 条目 = DOM 选择器 + 环信接口
  （apis，含 SDK 方法名与说明）+ UIKit 实现思路（implNotes）+ 参考文件（refs）；
- **匹配算法**（resolveDevHint）：两轮匹配，先 specific（气泡/输入框/详情面板）再
  container（`.chat`、`.conversation-container`），同轮取离目标最近的命中；
- 事件委托挂在 `.demo-layout` 根（useDevHints + rootRef），移动端无 hover 自动禁用；
- **维护约定：refs 引用文件路径而非行号**（uikit 迭代时随代码同步更新）；素材来源
  sdk/domain、modules 与 SDK d.ts；新增条目时同步更新 registry 与 types.ts；
- 展示形态：悬停浮出卡片（title + summary + apis + implNotes + refs 链接），条目可配
  `badgeDelay` 延迟浮出、`highlight` 整区高亮、`verify` 回调过滤。

## 7. 常用验证

- 启动：`cd apps/demo && pnpm dev`（源码模式改 src 热更；tgz 模式需先 build + 重装）；
- demo 类型检查：`cd apps/demo && pnpm exec vue-tsc --noEmit`（解析 dist 类型）；
- 联调闭环：改 src → `pnpm -F @easemob/uikit build` → 重新安装 tgz 依赖 → dev；
  长期开发建议直接恢复源码 alias 模式（见 §1），不要停留在 tgz 模式。

## 硬规则 vs 软约定

**硬规则：**

- 恢复源码模式必须配**两条** alias，`@easemob/uikit/theme` 排前面（顺序错误会导致
  theme 子路径被主 alias 吞掉）。
- 业务多语言 key 必须 zh-CN / en 成对补齐（mergeLocaleMessages）。
- 新设置状态必须放进 `useDemoSettings` 单例，禁止面板里另起 ref。
- Dev Hints refs 只引用文件路径，不写行号。
- `useClient()` 只能在 Provider 内调用（AppContent 内部组件模式）。
- demo 的 vue-tsc 解析 dist 类型：改公开 API 后先重建 dist。

**软约定：**

- 登录配置与设置记忆 key 命名：登录用 `uikit_demo_login_config`，设置用 `demo-` 前缀。
- mock 数据注入只用于演示（拼音 adapter / 1000 条会话 / 联系人），不要依赖它们做断言。
- 预设账号 token 是测试环境凭证，过期后由联调同学刷新 demoPresetUsers。

## 已知漂移（改到相关文件时注意）

- demo 依赖声明当前是 `file:../../easemob-uikit-1.3.1.tgz`（2026-08-12 tgz 临时验证
  模式，vite.config.ts 有注释说明）；验证完成后应恢复源码 alias 模式并将依赖改回
  `workspace:*`（或 `^1.x`）并 `pnpm install`。
- demo 自带 `pinyin-pro` 依赖仅用于拼音 adapter 演示，业务侧可自选实现。
- `chatConfig` 的字段随 `EmChatContainer` props 演进，组装处与容器类型要同步更新
  （以 `packages/uikit/src/modules/chat/chat.vue` 的类型契约为准）。

## 反面清单

- ❌ 在 tgz 模式改 `packages/uikit/src` 后不 build 就刷新页面——改动不生效。
- ❌ 恢复 alias 时把 theme 子路径排在后面——theme 样式 404 或解析到错误模块。
- ❌ 设置面板里另起 ref 不复用 useDemoSettings——面板改动不生效（状态分叉）。
- ❌ i18n 只加 zh-CN——切英文后 key 裸奔。
- ❌ Dev Hints 写行号——代码一漂移提示就指向错文件。
- ❌ 在 Provider 外（如 login-page 顶层）调用 useClient——运行时报错。
- ❌ 把预设账号 token 提交到公开仓库之外的地方泄露——仅测试环境使用。
- ❌ demo 改动不跑 `pnpm exec vue-tsc --noEmit`——发布 demo 时类型错误晚发现。
