# 技术债 / 待修清单（easemob-uikit-vue）

> 来源：2026-07 一次围绕「依赖库使用 + 编码规范」的全量源码 review（顺带扫出的问题）。
> 用法：逐条修复，改完把 `[ ]` 勾成 `[x]` 并在条目后补一句「已于 <commit> 修复」。
> 每条都注明 **现象 / 证据 / 建议修法 / 关联 skill**。证据里的行号可能随改动漂移，以文件+特征定位为准。

规则约束见根 `AGENTS.md` 与 `.agent/skills/*`。修复默认先验证（`vue-tsc --noEmit` + `build`）再提交，commit message 用中文，不主动 push。

---

## P0 · 结构性 / 会误导后人

（当前已清空；原 D1/D2 见下方「已修复」。）

---

## P1 · 一致性 / 契约漂移

### [ ] D3. 主题 token 漂移：大量硬编码颜色 / 圆角 / 动效时长

- **现象**：库的样式契约是「只用 `var(--uikit-*)` token」，但组件 `<style>` 里散落 **140 处 hex + 51 处 rgba** 字面量，还有 ~50 处硬编码 `transition` 时长绕过动画开关。
- **证据（worst offenders）**：`modules/chat/multi-select-bar/multi-select-bar.vue`(16 hex)、`modules/chat/message-item/message-bubble-wrapper.vue`(10)、`components/input/input.vue`(10)、`modules/conversation/conversation-item.vue`(7)、`modules/chat/drawer/chat-info-drawer.vue`(7)、`components/avatar/avatar.vue`(6)、`components/button/button.vue`(5)。多处手抄 theme 值（`#e5e7eb`≈border ×20、`#f3f4f6`≈bg-secondary ×16、`#fff` ×28），还引入了不在色板里的 `#5f6df3/#3b82f6/#007aff/#155eef/#ef4444/#ff4d4f`。
- **建议修法**：批量把颜色/圆角/时长替换为已存在的 `--uikit-*` token（缺 token 先加进 `src/theme/index.css`）；动效改用 `var(--uikit-anim-duration/easing)`。可分模块逐个清。**2026-07 H5 适配专项已顺手修复 message-input emoji sheet 等 H5 高频路径的硬编码时长，全局 140+ hex 仍需继续清理。**
- **关联 skill**：`uikit-styling-theming`

### [ ] D4. 组件引用了「未定义」的 `--uikit-*` 变量，永远走 fallback 且 fallback 互相不一致

- **现象**：组件里引用了 `theme/index.css` 与 `store/theme.ts` **都没有定义**的变量名，只能永远渲染 inline fallback；而不同文件对同一变量给的 fallback 还不一样。
- **证据**：`--uikit-text-tertiary` / `--uikit-bg-tertiary` / `--uikit-bg-active` / `--uikit-primary` / `--uikit-primary-hover` / `--uikit-primary-rgb` / `--uikit-danger-rgb` / `--uikit-border` 均未定义。例：
  - `var(--uikit-bg-tertiary, #f0f0f0)`（combine-message）vs `var(--uikit-bg-tertiary, #e8e8e8)`（multi-select-bar）。
  - `var(--uikit-primary-rgb, 59,130,246)`（conversation-item）——这是蓝色，和真实 primary `hsl(203,100%,60%)` 色相都不符，焦点色调永远是错的。
  - `var(--uikit-text-tertiary, #c0c4cc)` vs `var(--uikit-text-tertiary, var(--uikit-text-secondary))` 两种 fallback 策略并存。
- **建议修法**：确定这些语义 token 是否该存在——该存在的补进 `theme/index.css`（含暗色），不该存在的替换为既有 token；统一 fallback。
- **关联 skill**：`uikit-styling-theming`

### [ ] D5. `loaded + explicitCount` 计数模式只落地了一半

- **现象**：contact/group store 已用「加载后 count 派生自 list.length，未加载用轻量 explicitCount」（本轮刚修的响应式 bug），但 conversation/message store 没有等价物；`conversation` 的 `hasMoreConversations` 甚至恒为 `false`。
- **证据**：`explicit*Count` 仅存在于 `store/contact.ts`、`store/group.ts`；`store/conversation.ts` 有 `conversationsLoaded` 但无 count，`hasMoreConversations = computed(() => false)`。
- **建议修法**：确认 conversation/message 是否也需要对外总数；需要则对齐同一模式；`hasMoreConversations` 恒 false 若是占位要么接真值要么标 TODO。
- **关联 skill**：`uikit-store-composable`

### [ ] D6. composable 绕过 `useUIKit()` 直接取 store

- **现象**：feature composable 约定通过 `useUIKit().stores` 拿 store，但个别直接 `useXxxStore()`，造成状态来源不统一。
- **证据**：`composables/use-blocklist.ts` 直接 `useContactStore()`，同时又从 `useUIKit()` 取 `client/dataSource/features`，重复了 contact composable 已暴露的状态。（`use-theme.ts`/`use-ripple.ts` 直接 `useThemeStore()` 属可接受，因为 theme 是单独 provide 的。）
- **建议修法**：`useBlocklist` 改为经 `useUIKit().stores.contact`；或明确 theme 之外一律走 context。
- **关联 skill**：`uikit-store-composable`

### [ ] D7. `auto-imports.ts` 与实际导出漂移，无守卫

- **现象**：`src/auto-imports.ts` 是手工维护的 13 个「主 hook」白名单，与 `composables/index.ts` 的 28 个导出没有任何同步机制，已经漂移。
- **证据**：`usePresence`、`useBlocklist` 是完整 feature composable 却未登记；另有 `useMessageSend/History/Actions`、`useContactFilter/Sort/Group`、`useGroupFilter/Sort`、`useQuote`、`usePullRefresh`、`useRipple`、`usePinyin`、`useUIKitStorage` 未登记（部分是刻意，部分是漏）。
- **建议修法**：决定哪些属「对外主 hook」并补齐；理想加一个生成/校验脚本从 `index.ts` 派生 auto-imports 列表，杜绝再漂移。
- **关联 skill**：`uikit-store-composable`

---

## P2 · 局部 / 低风险

### [x] D8. 两套长按实现并存（自写 vs vueuse）

- **现象**：`composables/use-long-press.ts` 是自写 `setTimeout` 实现，`modules/conversation/conversation-item.vue` 又直接用 vueuse 的 `onLongPress`，功能重复。
- **修复**：2026-07 H5 适配专项中统一为 `useLongPress`，内部改用 vueuse `onLongPress`，并增加 touchmove 阈值（超过阈值取消长按）与长按时临时禁止 body 滚动，解决 H5 长按与页面滚动冲突。
- **关联 skill**：`uikit-store-composable` / `uikit-h5-adaptation`
- **验证**：`pnpm -F @easemob/uikit exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 通过。

### [ ] D9. i18n：一处硬编码中文漏翻 + `t()` 无插值

- **现象 1**：`modules/chat/message-input/rich-input.vue` 语音提示 `{{ isRecording ? '松开结束录音' : '按住说话' }}` 硬编码中文，英文环境不翻译；而 `simple-input.vue`/`voice-panel.vue` 同处正确用了 `t('chat.voice.releaseEnd')` 等已存在的 key。
- **现象 2**：`useLocale().t(key)` 只做 map 查找 + key 兜底，**不做 `{placeholder}` 插值**；`'chat.pinnedBar.count': '{count} 条置顶消息'` 这类 key 需调用方自己 replace，易漏。
- **建议修法**：rich-input 改用既有 key；评估是否给 `t()` 加最小插值能力（`t(key, params)`），或统一约定调用方替换并在 skill 里写死。
- **关联 skill**：`uikit-i18n-locale`

### [ ] D10. 模块层约 30% 组件用内联 `defineProps<{}>` 字面量而非命名 interface

- **现象**：components/containers 层 100% 用命名 `XxxProps` interface，modules 层约 12/42 文件内联字面量（集中在 `modules/contact/*`、`modules/group/*`）。不影响功能，但不利于 props 复用与文档化，lint 也抓不到。
- **建议修法**：新写强制命名 interface（skill 已约定）；存量可逐步收敛，非紧急。
- **关联 skill**：`uikit-component-authoring`

### [ ] D11. `chat/message-input.vue` 与 `chat/message-input/` 目录并存，结构歧义

- **现象**：`modules/chat/` 下同时有顶层 `message-input.vue` 和 `message-input/` 目录（内含 rich/simple input 等），命名易混。
- **建议修法**：厘清职责后合并到目录内，或重命名顶层文件（如 `message-input-bar.vue`）。
- **关联 skill**：`uikit-component-authoring`

### [ ] D12. 动效未接入变量的比例偏高

- **现象**：主题里有完整 `--uikit-anim-*` 体系（含 subtle/expressive/关闭/reduced-motion 开关），但组件里约 50 处 `transition` 用字面时长/缓动，绕过开关（只有 ~8 处 duration + ~12 处 easing 真正用了变量）。
- **建议修法**：过渡统一改用 `var(--uikit-anim-duration/easing)`，让全局动画开关真正生效。可与 D3 一起清。**2026-07 H5 适配专项已修复 message-input 等 H5 路径的硬编码 transition，剩余 ~50 处仍需继续清理。**
- **关联 skill**：`uikit-styling-theming`

---

## 已修复（归档）

- [x] **D1. 移除未使用的 UnoCSS（含 demo 侧）**
  - 已于 <待填 commit> 修复。
  - 改动：删除 `packages/uikit/uno.config.ts`、`apps/demo/uno.config.ts`；从 `packages/uikit/package.json`、`apps/demo/package.json` 移除 `unocss` 及 `@unocss/*` 依赖；从 `packages/uikit/histoire.config.ts`、`apps/demo/vite.config.ts`、`packages/uikit/src/histoire-setup.ts` 移除 UnoCSS 插件/import。
  - 验证：`pnpm -F @easemob/uikit exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 均通过；产物 `dist/easemob-uikit.js` 不再包含 UnoCSS。

- [x] **D2. 修正库构建 external，把 `im-sdk-web` 改为 `easemob-websdk`**
  - 已于此前提交修复。
  - 改动：`packages/uikit/vite.config.ts` 的 `rollupOptions.external` 与 `output.globals` 中 `im-sdk-web` → `easemob-websdk`。
  - 验证：构建产物 `dist/easemob-uikit.js` 以 `import { ChatClient as H2, ... } from "easemob-websdk"` 引入 SDK；UMD 产物以 `require("easemob-websdk")` 引入；SDK 不再内联到 UIKit 包中。

- [x] **D8. 统一长按实现并修复 H5 长按与滚动冲突**
  - 已于 2026-07 H5 适配专项修复。
  - 改动：`composables/use-long-press.ts` 改用 vueuse `onLongPress`，增加 touchmove 阈值与长按时 `document.body.style.overflow='hidden'` 滚动抑制；`modules/conversation/conversation-item.vue`、`modules/chat/message-item/message-interactive.vue` 统一改用 `useLongPress`。
  - 验证：类型检查 + 构建 + demo 类型检查通过。

- [x] **H5 适配核心能力落地（2026-07 专项）**
  - 已于 `04e07ca` 修复。
  - 改动：
    - 新增 `packages/uikit/src/composables/use-h5-adaptation.ts`，集中管理 viewport/安全区/键盘高度/下拉刷新/字号缩放预留；
    - `theme/index.css` 新增 `--uikit-safe-*` 与 `--uikit-font-scale`；
    - `use-uikit.ts` 的 `UIKitContext` 注入 `h5` 单一实例；`use-viewport.ts` 优先从 context 读取；
    - `uikit-provider.vue` 新增 `h5?: H5AdaptationConfig` prop，`safeArea=false` 时覆写 CSS 变量为 `0px`；
    - 安全区接入：`chat-container`、`chat` header、`address-book-container` header/footer、`popup` bottom、`scroll-to-top`、`message-input` emoji sheet、`conversation-list` header/footer；
    - 键盘适配：`chat.vue` 读取 `h5.keyboardHeight` 传给 `MessageInput`，输入框 focus 触发 `message-list.scrollToBottom()`；
    - 动画修复：`message-input` emoji sheet 改用 `uikit-slide-up` Vue Transition，多处硬编码 `0.15s/0.2s` transition 改接 `--uikit-anim-*`；
    - 导出更新：`composables/index.ts`、`auto-imports.ts` 加入 `useH5Adaptation`。
  - 验证：`pnpm -F @easemob/uikit exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 均通过。
