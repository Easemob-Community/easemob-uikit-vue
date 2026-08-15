# 技术债 / 待修清单（easemob-uikit-vue）

> 来源：2026-07 两次全量源码 review——第一次围绕「依赖库使用 + 编码规范」，第二次围绕「功能完整性 + 正确性 + 影响面」。
> 用法：逐条修复，改完把 `[ ]` 勾成 `[x]` 并在条目后补一句「已于 <commit> 修复」。
> 每条都注明 **现象 / 证据 / 建议修法 / 关联 skill**。证据里的行号可能随改动漂移，以文件+特征定位为准。

规则约束见根 `AGENTS.md` 与 `.agent/skills/*`。修复默认先验证（`vue-tsc --noEmit` + `build`）再提交，commit message 用中文，不主动 push。

---

## P0 · 结构性 / 会误导后人

### [x] D13. `useLongPress` 组件卸载时未清理定时器和 body 滚动锁

- **现象**：`useLongPress` 创建 `setTimeout` 并设置 `document.body.style.overflow = 'hidden'`，但没有 `onScopeDispose` / `onUnmounted` 清理。组件在长按过程中卸载时 `cleanup()` 不会被调用，导致页面永久无法滚动。
- **证据**：`composables/use-long-press.ts` L28-L113，`cleanup()` 仅在 `end()`/`cancel()`/定时器回调中调用，无生命周期清理。该问题由 D8 修复引入（D8 增加了 `setBodyScroll(false)` 但未配套清理）。
- **建议修法**：在 return 前添加 `onScopeDispose(() => cleanup())`。
- **修复**：已于 2026-07-28 修复。`use-long-press.ts` return 前补 `onScopeDispose(() => cleanup())`；`cleanup()` 幂等（内部判空），会恢复 `body.style.overflow` 并清定时器。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-store-composable`

### [x] D14. `GroupMemberList` 未清理 IntersectionObserver 和定时器

- **现象**：组件创建了 `IntersectionObserver`（`presenceObserver`）和 `setTimeout`（`presenceFetchTimer`），但无 `onBeforeUnmount` 钩子清理。卸载后 observer 继续观察已移除 DOM，定时器在已销毁组件上下文中执行 `fetchPresence`，造成内存泄漏和潜在报错。
- **证据**：`modules/group/group-member-list.vue` L92-L93 创建，全文件无 `onBeforeUnmount`。
- **建议修法**：添加 `onBeforeUnmount(() => { presenceObserver?.disconnect(); presenceObserver = null; if (presenceFetchTimer) { clearTimeout(presenceFetchTimer); presenceFetchTimer = null } })`。
- **修复**：已于 2026-07-28 修复。`group-member-list.vue` 补 `onBeforeUnmount` 钩子：`presenceObserver.disconnect()` 置 null、`clearTimeout(presenceFetchTimer)` 置 null。
- **关联 skill**：`uikit-component-authoring`

### [x] D15. 多选状态在会话切换时泄漏

- **现象**：`isMultiSelectMode` 和 `selectedMessageIds` 是模块级 `ref` 单例。`exitMultiSelectMode()` 仅在 `onUnmounted` 调用，不在 `watch(currentConversation)` 会话切换时调用。用户在会话 A 进入多选后切换到会话 B，多选栏仍可见且状态为空。
- **证据**：`composables/use-message-actions.ts` L8-L10 模块级单例；`modules/chat/chat.vue` L398-L440 `watch(currentConversation)` 未调用 `exitMultiSelectMode()`。
- **建议修法**：在 `chat.vue` 的 `watch(currentConversation, ...)` 回调开头调用 `exitMultiSelectMode()`。
- **修复**：已于 2026-07-28 修复。`chat.vue` 的 `watch(currentConversation, ...)` 回调在保存草稿之前（守卫判断之后）新增 `exitMultiSelectMode()` 调用，与既有 `clearQuote()`/`exitEditMode()` 清理并列。logout/切账号不重置的残留见 D84。
- **关联 skill**：`uikit-store-composable`

### [x] D16. UserInfoDomain 事件监听在 Provider 卸载时未清理

- **现象**：`onScopeDispose` 仅调用 `disposeEvents?.()`，未调用 `disposeUserInfoDomain?.()`。Provider 组件卸载但不 logout 时（路由切换/条件渲染），`UserInfoDomain.listen()` 注册的 SDK 事件处理器泄漏，重新挂载时注册重复处理器导致事件双次处理。
- **证据**：`composables/use-uikit.ts` L227-L229，仅 `disposeEvents?.()`；`setupClient` 中 `domains.userInfo.listen()` 注册了 `addEventHandler`。
- **建议修法**：`onScopeDispose(() => { disposeEvents?.(); disposeUserInfoDomain?.(); disposeUserInfoDomain = null })`。
- **修复**：已于 2026-07-28 修复。`use-uikit.ts` 的 `onScopeDispose` 在 `disposeEvents` 之外补 `disposeUserInfoDomain?.()`，两者均置 null，声明方式沿用文件内现有 `let disposeX: (() => void) | null = null` 风格。
- **关联 skill**：`uikit-store-composable`

---

## P1 · 一致性 / 契约漂移

### [x] D20. `Avatar` shape 在卡片与列表项中被硬编码，未遵循主题 `avatarShape`

- **现象**：`UserCard` 硬编码 `shape="circle"`、`GroupCard` 硬编码 `shape="square"`，`ContactItem*` / `GroupItem*` / `ContactList` / `GroupList` 的 `avatarShape` 默认值也硬编码为 `'circle'` / `'rounded'`。当用户通过主题设置把头像改成方形/圆角时，名片和列表项不会跟随变化。
- **证据**：`components/user-card/user-card.vue` L99 `shape="circle"`；`components/group-card/group-card.vue` L64 `shape="square"`；`modules/contact/contact-list.vue` L112 `avatarShape: 'circle'`；`modules/contact/contact-item.vue` L31 `avatarShape: 'circle'`；`modules/contact/contact-item-default.vue` L38 `avatarShape: 'circle'`；`modules/group/group-list.vue` L106 `avatarShape: 'rounded'`；`modules/group/group-item.vue` L32 `avatarShape: 'rounded'`；`modules/group/group-item-default.vue` L38 `avatarShape: 'rounded'`。
- **建议修法**：移除上述硬编码，默认值改为 `undefined`；`Avatar` 组件在 `props.shape` 为 `undefined` 时会自动读取 `themeStore.avatarShape`。`contact-item-default` / `group-item-default` 内部把 `rounded` 映射为 `square` 的逻辑保留，但 `undefined` 时返回 `undefined` 交给 `Avatar` 处理。
- **修复**：已于 2026-07-29 修复。涉及文件：`user-card.vue`、`group-card.vue`、`contact-list.vue`、`contact-item.vue`、`contact-item-default.vue`、`group-list.vue`、`group-item.vue`、`group-item-default.vue`。
- **关联 skill**：`uikit-styling-theming` / `uikit-component-authoring`

### [x] D3. 主题 token 漂移：大量硬编码颜色 / 圆角 / 动效时长

- **现象**：库的样式契约是「只用 `var(--uikit-*)` token」，但组件 `<style>` 里散落 **140 处 hex + 51 处 rgba** 字面量，还有 ~50 处硬编码 `transition` 时长绕过动画开关。
- **证据（worst offenders）**：`modules/chat/multi-select-bar/multi-select-bar.vue`(16 hex)、`modules/chat/message-item/message-bubble-wrapper.vue`(10)、`components/input/input.vue`(10)、`modules/conversation/conversation-item.vue`(7)、`modules/chat/drawer/chat-info-drawer.vue`(7)、`components/avatar/avatar.vue`(6)、`components/button/button.vue`(5)。多处手抄 theme 值（`#e5e7eb`≈border ×20、`#f3f4f6`≈bg-secondary ×16、`#fff` ×28），还引入了不在色板里的 `#5f6df3/#3b82f6/#007aff/#155eef/#ef4444/#ff4d4f`。2026-07-28 复核补充（暗色必现）：`components/user-card/user-card.vue:281,287` 与 `components/group-card/group-card.vue:185,191` action 按钮 `#f3f4f6`/hover `#e5e7eb`；`components/action-sheet/action-sheet.vue:84,99,109` 分隔线与按下态 `#f3f4f6`；`components/user-card/user-card-modal.vue:226`、`components/group-card/group-card-modal.vue:144` loading 遮罩 `rgba(255,255,255,0.7)`（暗色下盖白幕）；名片 banner 渐变 `#4f8cff/#2b6bf3/#7a5cff`（`user-card.vue:179`、`group-card.vue:128`）不跟随 primary token。
- **建议修法**：批量把颜色/圆角/时长替换为已存在的 `--uikit-*` token（缺 token 先加进 `src/theme/index.css`）；动效改用 `var(--uikit-anim-duration/easing)`。可分模块逐个清。
- **进展**：2026-08-05 主题 Phase 1 已清理 worst offenders（multi-select-bar / message-bubble-wrapper / input / conversation-item / chat-info-drawer / avatar / button / action-sheet / emoji-picker / user-card / group-card / presence-selector / icon-button）中的裸 hex、硬编码圆角与 transition，新增 `--uikit-shadow-sm` token。剩余非高频文件中的散落 hex 仍待继续清理。
- **进展 2（2026-08-15）**：精确统计裸 hex（排除 var fallback 后）约 82 处，本轮清理两块：
  1. **白色文字/背景**（41 处 `#fff`/`#ffffff`）：新增语义 token `--uikit-text-inverse: #ffffff`（浅色+暗色均恒白，强调色/彩色背景上的文字：按钮/badge/toast/播放按钮/头像等 21 个文件）；`background-color: #fff`（4 处）→ `var(--uikit-bg-elevated)`；模板内 `color="#fff"` prop（video-message）保留。
  2. **危险色**（9 处裸 `#ef4444`）→ `var(--uikit-danger-color)`（含 3 处 JS 动态样式 `color: 'var(--uikit-danger-color)'`，Vue 内联 style 支持 CSS 变量）；同时清理了 fallback 形式被全局替换误产生的自引用嵌套 `var(--uikit-danger-color, var(--uikit-danger-color))`。
  - **剩余约 33 处**：状态标签浅色（`#fef2f2`/`#dbeafe`/`#d1fae5`/`#fecaca` 等 role/status 徽章）、名片 banner 渐变（`#4f8cff`/`#2b6bf3`/`#7a5cff`，D3 证据提及不跟随 primary）、`#2563eb` 等——需新增状态/渐变 token 或按语义决策，留待 D3 收尾续做。
- **修复（2026-08-15 收尾完成）**：第三轮清理剩余状态色——**零新增 token 方案**：role/status 徽章（owner/admin/muted/blocked/allowlist、declined/accepted 状态、danger/accept/reject 按钮）全部改用已有 `--uikit-*-rgb` 派生 rgba 浅色背景/边框（`rgba(var(--uikit-warning-rgb), 0.12)` 等）+ `var(--uikit-*-color)` 文字，**自动跟随主题色、暗色自然适配**；涉及 `group-member-list-item.vue`（13 处）、`chat-info-drawer-member-cell.vue`（owner/admin）、`join-request-list-item.vue`（状态+按钮）、`allow-list-item.vue`（danger 按钮）、`group-management-section.vue`（toggle 开关灰 → `--uikit-border-color`）、`voice-panel.vue`（border → `--uikit-border-color`）。
  - **有意保留（全仓最后 4 处裸 hex）**：名片 banner 渐变 `#4f8cff/#2b6bf3/#7a5cff`（user-card/group-card，品牌渐变视觉，不跟随主题为设计选择）、avatar 无头像随机占位色板（5 色，加 token 无意义）、video-message 模板 Icon prop `color="#fff"`（非 CSS）。
- **关联 skill**：`uikit-styling-theming`

### [x] D4. 组件引用了「未定义」的 `--uikit-*` 变量，永远走 fallback 且 fallback 互相不一致

- **现象**：组件里引用了 `theme/index.css` 与 `store/theme.ts` **都没有定义**的变量名，只能永远渲染 inline fallback；而不同文件对同一变量给的 fallback 还不一样。
- **证据**：`--uikit-text-tertiary` / `--uikit-bg-tertiary` / `--uikit-bg-active` / `--uikit-primary` / `--uikit-primary-hover` / `--uikit-primary-rgb` / `--uikit-danger-rgb` / `--uikit-border` 均未定义。例：
  - `var(--uikit-bg-tertiary, #f0f0f0)`（combine-message）vs `var(--uikit-bg-tertiary, #e8e8e8)`（multi-select-bar）。
  - `var(--uikit-primary-rgb, 59,130,246)`（conversation-item）——这是蓝色，和真实 primary `hsl(203,100%,60%)` 色相都不符，焦点色调永远是错的。
  - `var(--uikit-text-tertiary, #c0c4cc)` vs `var(--uikit-text-tertiary, var(--uikit-text-secondary))` 两种 fallback 策略并存。
  - 2026-07-28 复核：`--uikit-text-tertiary` / `--uikit-bg-tertiary` 已在 `theme/index.css:11,16` 定义（本条部分描述已过时）；`--uikit-primary-rgb` 已在 `theme/index.css:23` 定义但固定 `59, 130, 246`（蓝），既不等于默认 primary `hsl(203,100%,60%)`，且 `store/theme.ts:111` 改主题色时不同步重算 → cell 契约 pinned 态 `rgba(var(--uikit-primary-rgb), 0.04)` 永远是错误的蓝。
- **建议修法**：确定这些语义 token 是否该存在——该存在的补进 `theme/index.css`（含暗色），不该存在的替换为既有 token；统一 fallback。
- **修复**：2026-08-05 主题 Phase 1 完成：`theme/index.css` 已统一定义上述变量（含暗色）；`store/theme.ts` 新增 `--uikit-primary-hover` 运行时同步，确保改主题色后别名与 `rgba(var(--uikit-primary-rgb), α)` 同步；worst offenders 中的不一致 fallback 已统一或移除。
- **关联 skill**：`uikit-styling-theming`

### [x] D5. `loaded + explicitCount` 计数模式只落地了一半

- **现象**：contact/group store 已用「加载后 count 派生自 list.length，未加载用轻量 explicitCount」（本轮刚修的响应式 bug），但 conversation/message store 没有等价物；`conversation` 的 `hasMoreConversations` 甚至恒为 `false`。
- **证据**：`explicit*Count` 仅存在于 `store/contact.ts`、`store/group.ts`；`store/conversation.ts` 有 `conversationsLoaded` 但无 count，`hasMoreConversations = computed(() => false)`。
- **建议修法**：确认 conversation/message 是否也需要对外总数；需要则对齐同一模式；`hasMoreConversations` 恒 false 若是占位要么接真值要么标 TODO。
- **修复**：已于 2026-07-28 修复。分页断裂部分已修：`fetchContacts/fetchGroups` 把 dataSource 返回的 `hasMore/cursor` 落 store，`loadMore` 传 cursor 并改用 `appendContactList/appendGroupList`（详见 D43）；conversation-container 死 props 与 contact-container 废弃 props 兼容同步修复（见 D65/D66）。`hasMoreConversations` 恒 false 为**有意保留**——SDK 无服务端会话分页能力，会话列表本就全量在本地，代码中已加注释说明该取舍。
- **关联 skill**：`uikit-store-composable`

### [x] D6. composable 绕过 `useUIKit()` 直接取 store

- **现象**：feature composable 约定通过 `useUIKit().stores` 拿 store，但个别直接 `useXxxStore()`，造成状态来源不统一。
- **证据**：`composables/use-blocklist.ts` 直接 `useContactStore()`，同时又从 `useUIKit()` 取 `client/dataSource/features`，重复了 contact composable 已暴露的状态。（`use-theme.ts`/`use-ripple.ts` 直接 `useThemeStore()` 属可接受，因为 theme 是单独 provide 的。）
- **建议修法**：`useBlocklist` 改为经 `useUIKit().stores.contact`；或明确 theme 之外一律走 context。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`composables/use-blocklist.ts:16-17` 已 `const { client, dataSource, features, stores } = useUIKit()` + `const contactStore = stores.contact`，黑名单读写全部走 context，无直接 `useContactStore()`。
- **关联 skill**：`uikit-store-composable`

### [x] D7. `auto-imports.ts` 与实际导出漂移，无守卫

- **现象**：`src/auto-imports.ts` 是手工维护的 13 个「主 hook」白名单，与 `composables/index.ts` 的 28 个导出没有任何同步机制，已经漂移。
- **证据**：`usePresence`、`useBlocklist` 是完整 feature composable 却未登记；另有 `useMessageSend/History/Actions`、`useContactFilter/Sort/Group`、`useGroupFilter/Sort`、`useQuote`、`usePullRefresh`、`useRipple`、`usePinyin`、`useUIKitStorage` 未登记（部分是刻意，部分是漏）。
- **建议修法**：决定哪些属「对外主 hook」并补齐；理想加一个生成/校验脚本从 `index.ts` 派生 auto-imports 列表，杜绝再漂移。
- **修复**：已于 2026-08-15 修复。
  1. **白名单补齐**：`src/auto-imports.ts` 扩到 **34 个业务主 hook**（新增 `useMessageSend/useMessageHistory/useMessageActions`、`useContactFilter/useContactGroup/useContactSort`、`useGroupFilter/useGroupSort`、`usePullRefresh`、`useChatPlugin`、`useResizable`，补全 `usePresence`/`useBlocklist`），排序归一；排除名单明确为内部实现细节（`usePinyin`/`useRipple`/`useQuote`/`useUIKitStorage` 及附属工具函数等 23 个，业务侧显式 import）。
  2. **校验脚本防漂移**：新增 `packages/uikit-im/scripts/check-auto-imports.mjs`——从 `composables/index.ts` 派生导出并剔除排除名单，与白名单比对，**漏登记硬失败**（`extra` 仅提示，允许 locale 等其他模块的合法登记）；已挂载到 `build` 前置（与 `check-icon-refs` 并列），也可单独跑 `pnpm -F @easemob/uikit-im auto-imports:check`。
- **关联 skill**：`uikit-store-composable`

### [x] D17. `updateUploadProgress` 未实际更新上传进度值

- **现象**：`updateUploadProgress` 接收了 `_percent` 参数（前缀 `_` 表示未使用），只做了 `{ ...msg }` 展开，没有将 `percent` 赋值到消息的 `progress` 字段。上传进度永远不会反映到 UI。
- **证据**：`store/message.ts` L156-L158，`_updateMessageById(localId, msg => ({ ...msg }))` 未写入 `progress`。
- **建议修法**：`function updateUploadProgress(localId: string, percent: number) { _updateMessageById(localId, msg => ({ ...msg, progress: percent })) }`。
- **修复**：已于 2026-07-28 修复。`store/message.ts` 的 `updateUploadProgress` 改为 `{ ...msg, progress: percent }`，percent 实际写入消息的 `progress` 字段，上传进度可反映到 UI。
- **关联 skill**：`uikit-store-composable`

### [x] D18. `onMembersExited` 事件缺少 `members` 空值检查

- **现象**：`onMembersExited` 直接访问 `(p.members as unknown[]).length`，而同文件的 `onMembersJoined` 使用了 `payload.members || []` 安全降级。SDK payload 的 `members` 为 `undefined` 时会抛 `TypeError`。
- **证据**：`sdk/event/group-events.ts` L56-L59，对比 L43 `const members = payload.members || []`。
- **建议修法**：`const members = (p.members as unknown[]) || []; stores.group.decrementMemberCount(p.groupId, members.length)`。
- **修复**：已于 2026-07-28 修复。`sdk/event/group-events.ts` 的 `onMembersExited` 增加空值守卫 `(p.members as unknown[]) || []`，与同文件 `onMembersJoined` 的降级方式对齐。
- **关联 skill**：`websdk2-uikit-migration`

### [x] D19. `resendMessage` 对媒体消息先删除后不重发，导致消息丢失

- **现象**：`resendMessage` 先执行 `deleteMessage` 删除旧消息，然后对 `image`/`voice`/`video`/`file` 类型仅打印 `console.warn` 并 `return`。失败的媒体消息被永久删除且无法恢复。
- **证据**：`composables/use-message-send.ts` L131 先 `deleteMessage`，L144-L149 媒体类型仅 warn+return。
- **建议修法**：将 `deleteMessage` 移到确认可重发之后；对媒体类型提前 return 不删除：`if (['image','voice','video','file'].includes(message.type)) { console.warn(...); return }` 然后再 `deleteMessage` + 重发文本/自定义消息。
- **修复**：已于 2026-07-28 修复。`resendMessage` 重构：`messageStore.deleteMessage` 从 switch 之前移入 `text`/`custom` 分支内部（确认可重发后才删）；`image/voice/video/file` 分支在删除之前直接 warn + return，失败的媒体消息保留在本地。媒体重发仍无实际重发能力且无 toast 提示，残留见 D84。
- **关联 skill**：`uikit-store-composable`

### [x] D20. `uploadGroupSharedFile` 存在回调与 Promise 竞态条件

- **现象**：通过 `onFileUploadComplete` 回调赋值 `response` 变量，然后 `await` 上传 Promise。如果 Promise 在回调触发之前 resolve，`response` 仍为 `undefined`。
- **证据**：`sdk/domain/group-domain.ts` L275-L284，`let response: unknown` + `await ...uploadSharedFile({...})` + `return response`。
- **建议修法**：用 Promise 包装回调：`return new Promise((resolve, reject) => { ...uploadSharedFile({ file, onFileUploadComplete: resolve, onFileUploadError: reject }) })`。
- **修复**：已于 2026-07-28 修复。`sdk/domain/group-domain.ts` 的 `uploadGroupSharedFile` 改为 Promise 包装 `onFileUploadComplete`/`onFileUploadError` 回调，`response` 不再依赖回调与 Promise 的先后时序。
- **关联 skill**：`websdk2-uikit-migration`

### [x] D21. ThemeStore 和 `useH5Adaptation` 直接访问 `document`/`window` 无 SSR 保护

- **现象**：Store setup 中直接调用 `document.documentElement.style.setProperty(...)`；`useH5Adaptation` 的 `updateViewportAndSafeArea()` 直接访问 `window.innerWidth` 等。SSR 环境下会 `ReferenceError` 崩溃。且 ThemeStore L111-122 的初始化与下方 `watchEffect` 重复。
- **证据**：`store/theme.ts` L111-L122 无 `typeof document` 守卫；`composables/use-h5-adaptation.ts` L57-L79 `updateViewportAndSafeArea()` 内无 `typeof window` 守卫（ref 初始值 L46-47 有守卫但函数内没有）。
- **建议修法**：ThemeStore 移除 L111-122 直接调用（`watchEffect` 已覆盖）或加 `if (typeof document === 'undefined') return`；`useH5Adaptation` 函数开头加 `if (typeof window === 'undefined') return`。
- **修复**：已于 2026-07-28 修复。两部分均已修：`store/theme.ts` 删除 setup 中重复直写 `document.documentElement` 的初始化代码（`watchEffect` 首次同步执行已覆盖，行为不变）；`composables/use-h5-adaptation.ts` 的 `updateViewportAndSafeArea()` 开头补 `if (typeof window === 'undefined') return` 守卫。
- **残留（2026-08-03 文档站建设时发现）**：`composables/use-h5-adaptation.ts` 的 `useEventListener(window, 'resize', ...)` 与 `if (window.visualViewport)`（约 L94-L97）仍无 `typeof window` 守卫，SSR 环境（如 VitePress 预渲染）setup 阶段直接 `ReferenceError: window is not defined`。文档站目前以 `ClientOnly` 包裹 demo 规避（`apps/docs/.vitepress/theme/DemoBlock.vue`），库本体仍需补守卫。
- **关联 skill**：`uikit-styling-theming` / `uikit-h5-adaptation`

### [x] D22. 自动重连后未恢复 `currentUser`，`isLoggedIn` 永远为 false

- **现象**：`onDisconnected` 清空 `currentUser`，`onConnected`（自动重连）设置 `connected = true` 但不恢复 `currentUser`。重连后 `isLoggedIn = connected && !!currentUser` 仍为 `false`，`watch(isLoggedIn)` 不触发，黑名单/联系人不重新拉取。`chat-events.ts` 的 `onMessage` 用 `currentUser` 判断 `isSelf`，重连后全部失效。
- **证据**：`sdk/event/connection-events.ts` L17-L21 `onDisconnected` 清空 `currentUser`；L13-L16 `onConnected` 不恢复。
- **建议修法**：不在 `onDisconnected` 时清空 `currentUser`（仅 `logout()` 时清空），或在 `onConnected` 中从 SDK 恢复：`const uid = (stores.client as any).client?.getCurrentUserId?.(); if (uid) stores.client.setCurrentUser(uid)`。
- **修复**：已于 2026-07-28 修复。`connection-events.ts` 的 `onDisconnected` 删除 `setCurrentUser('')`，保留 `setConnected(false)`/`setConnecting(false)`，并加注释说明 currentUser 仅 logout 时清除；`store/client.ts` 的 `clearClient` 补上漏清的 `connecting.value = false`。
- **关联 skill**：`websdk2-uikit-migration`

### [x] D23. Group store 直接对象修改绕过 `computed` 响应式

- **现象**：`updateGroup`、`updateGroupJoinRequest`、`updateGroupMemberRole` 通过 `Object.assign(g, patch)` / `item.status = status` / `member.role = role` 原地修改对象，不替换数组引用。`computed(() => groupMembersMap.value)` 依赖 ref 值身份，内部属性变更不触发 computed 重算。组件通过 computed 读取时不收到更新。
- **证据**：`store/group.ts` L89-L93 `Object.assign(g, patch)`；L229-L235 `item.status = status`；L274-L279 `member.role = role`。
- **建议修法**：用新数组引用替换：`groupMembersMap.value = { ...groupMembersMap.value, [groupId]: list.map(m => m.userId === userId ? { ...m, role } : m) }`。对 `updateGroup` 和 `updateGroupJoinRequest` 同理。
- **修复**：已于 2026-07-28 修复。`store/group.ts` 五处原地修改全部改不可变更新：`updateGroup`/`incrementMemberCount`/`decrementMemberCount` 用 `groupList.value = map(...)` 替换数组引用；`updateGroupJoinRequest`/`updateGroupMemberRole` 用 `{ ...map, [groupId]: list.map(...) }` 替换 map 与数组引用。
- **关联 skill**：`uikit-store-composable`

### [x] D24. `useChat().setTyping()` / `sendTypingCmd()` 为空实现 — 打字指示器功能无效

- **现象**：`setTyping()` 和 `sendTypingCmd()` 均为空占位函数。UI 已完整接线（`TypingIndicator` 组件已渲染、`@typing` 事件已绑定、`enableTyping` 默认 `true`），但 `typingMap` 永远为空，`isTyping` 永远为 `false`，打字指示器永远不显示。属于功能死端。
- **证据**：`composables/use-chat.ts` L44-L46 `sendTypingCmd` 空函数 + L146-L148 `setTyping` 空函数；`modules/chat/chat.vue` L313-L357 已接线 `isTyping` computed 和 `setTyping()` 调用。2026-07-28 复核新证据：`store/conversation.ts:101` 的 `setTyping` 全工程无任何调用方；`chat.vue:341-345,362` 依赖空 `setTyping()` 在 5 秒后清除 typing 状态——即便未来有地方写入 `typingMap=true`，也永远无法被清除（卡死在「正在输入」）。另外 `onMessage` 现已过滤 cmd 消息（2026-07-28 修复），收到 typing cmd 也不会转成 typingMap 状态。
- **建议修法**：实现 CMD 消息发送 + store 更新，或如本期不实现则移除 UI 绑定以避免混淆。
- **修复**：已于 2026-07-28 修复。按「本期不实现则移除」方案整链下掉死代码：`use-chat.ts` 删除 `sendTypingCmd`/`setTyping` 空函数与 `TYPING_DURATION`；`chat.vue` 删除 `TypingIndicator` 接线、typing 相关 computed/watch/定时器；`typing-indicator/` 目录整体删除；`store/conversation.ts` 的 `typingMap`/`setTyping` 残留清零（全工程已无消费方）；`message-input/index.vue` 的 `@typing` 绑定同步移除。死代码已移除，真正实现待后续单独立项（当前 TECH-DEBT 未登记 typing 实现条目）。
- **关联 skill**：`uikit-store-composable`

### [x] D25. 转让群主功能方法已实现但无 UI 入口

- **现象**：`changeGroupOwner` 方法已在 `use-group.ts` 和 `group-domain.ts` 中实现，但没有任何 UI 组件调用。`group-member-list.vue` 的 `getMoreActions()` 不包含转让群主操作项。
- **证据**：`composables/use-group.ts` L119-L122 定义 `changeGroupOwner`；`modules/group/group-member-list.vue` L387-L403 `getMoreActions()` 缺少 `transferOwner` 操作项；`chat.vue` 未导入 `changeGroupOwner`。
- **建议修法**：在 `getMoreActions()` 中为群主添加「转让群主」操作项（仅当前用户是群主且目标成员非自己时显示），并在 `chat.vue` 添加对应处理函数。
- **修复**：已于 2026-07-28 修复。`group-member-list.vue` 的 `getMoreActions()` 新增「转让群主」操作项（仅当前用户为群主且目标成员非自己时显示），上层接线调 `changeGroupOwner` 并 toast 成功/失败；locale 补 `group.memberList.transferOwner`、`chat.info.transferOwnerConfirm/Success/Failed` 四个 key（zh-CN/en 同步）。
- **关联 skill**：`uikit-contact-group-capabilities`

### [x] D26. 群信息编辑 UI 缺失（群名称/公告/描述）

- **现象**：`updateGroupInfo`（名称/描述/头像）和 `updateGroupAnnouncement` 方法已在 domain/composable 层完整实现，但 `chat-info-drawer.vue` 群信息面板中群名称仅展示不可编辑、群公告仅展示不可编辑、群描述仅当有值时才显示且不可编辑。群主/管理员无法通过 UI 修改群信息。
- **证据**：`composables/use-group.ts` L86-L88 定义 `updateGroupAnnouncement`，L165-L169 定义 `updateGroupInfo`；`modules/chat/drawer/chat-info-drawer.vue` L400-L410 仅展示群公告内容，L413-L421 群描述仅在有值时显示。
- **修复**：
  - 群名称：群主在 profile 区域可点击编辑按钮进行内联编辑，调用 `updateGroupInfo({ name })`；
  - 群公告：群主/管理员可点击编辑按钮进行内联编辑（textarea），调用 `updateGroupAnnouncement`；
  - 群描述：群主始终可见该区域（即使描述为空），可点击编辑按钮进行内联编辑（textarea），调用 `updateGroupInfo({ description })`；
  - 新增 i18n key：`chat.info.edit`、`chat.info.groupInfoUpdated`、`chat.info.groupInfoUpdateFailed`、`chat.info.noGroupDescription`。
- **关联 skill**：`uikit-contact-group-capabilities`

### [x] D38. `GroupDomain` 禁言/黑名单/白名单查询方法未同步 store 缓存

- **现象**：`getGroupMuteList()`、`getGroupBlocklist()`、`getGroupAllowlist()` 三个方法仅调用 SDK 并返回原始结果，未同步 `store.setGroupMuteList/setGroupBlocklist/setGroupAllowlist`。`group-management-section.vue` 使用 `stores.group.groupMuteListMap[id].length` 显示管理入口的计数 badge，永远为空（始终为 0）。同样，`blockGroupMembers()`、`unblockGroupMembers()`、`muteGroupMembers()`、`unmuteGroupMembers()` 写操作也未同步 store 缓存。
- **证据**：`sdk/domain/group-domain.ts` L220-L222 `getGroupMuteList` 仅 `return result`；L226-L228 `getGroupBlocklist` 仅 `return result`；L242-L244 `getGroupAllowlist` 仅 `return result`；`modules/group/group-management-section.vue` L96 使用 `stores.group.groupMuteListMap[id].length`。
- **修复**：
  - 扩展 `GroupStoreLike` 接口添加 `setGroupMuteList/addGroupMuteMembers/removeGroupMuteMembers/setGroupBlocklist/addGroupBlocklistMembers/removeGroupBlocklistMembers/setGroupAllowlist/addGroupAllowlistMembers/removeGroupAllowlistMembers` 方法；
  - 所有查询/写操作方法追加对应的 store 缓存同步调用。
- **关联 skill**：`websdk2-uikit-migration` / `uikit-store-composable`

### [x] D39. `group-management-section` 全员禁言 Cell 与其他管理项字体不一致

- **现象**：群管理面板中「全员禁言」开关 Cell 使用 `#default` 插槽渲染标题文本，不经过 `.uikit-cell__title` 样式约束，继承外层更大的字号；而下方「禁言列表」「黑名单」等管理入口 Cell 通过 `:title` prop 渲染，正确应用了 `font-size: 14px; font-weight: 500;`。视觉上字体明显偏大。
- **证据**：`modules/group/group-management-section.vue` L190 `#default` 插槽输出文本 vs L209 `:title="entry.label"`；`components/cell/cell.vue` L85-L88 `#default` 插槽内的内容不经过 `.uikit-cell__title`（14px/500）。
- **修复**：将全员禁言 Cell 的 `#default` 插槽改为 `:title` prop，使其与下方入口 Cell 享用相同的 `.uikit-cell__title` 字体样式。
- **关联 skill**：`uikit-cell-contract`

### [x] D40. 单聊「已读回执」功能整体缺失：对方永远看不到「已读」

- **现象**：进入会话、收到当前会话消息只调 `sendChannelAck`（实际只是 `clearConversationUnreadMessageCount`，协议仅同步自己多设备、不发送给对方），从不调用 `sendMessageReadReceipts`。单聊场景对端消息永远停在 delivered，`onMessageReadReceipts` 单聊已读分支对本端阅读行为而言是死代码。
- **证据**：`composables/use-chat.ts:95-100`（`sendReadAckForMessage` 唯一定义，无任何组件调用）；`sdk/domain/conversation-domain.ts:126-129`；`modules/chat/chat.vue:401-419`、`modules/conversation/conversation-list.vue:206-208`（进入会话只调 sendChannelAck）；`sdk/event/chat-events.ts:204-207`。
- **建议修法**：在进入会话/收到当前会话单聊消息时，对未读消息批量调用 `domains.message.markMessagesRead`（注意与清未读节流合并）。
- **修复**：已于 2026-07-28 修复。`sdk/event/chat-events.ts` 在当前会话收到单聊消息时，经 `queueMessageReadReceipt` 批量发送已读回执，`onMessageReadReceipts` 单聊分支不再是无输入的死代码，对端可正常看到「已读」。
- **关联 skill**：`websdk2-uikit-migration` / `uikit-store-composable`

### [x] D41. 群成员「禁言/取消禁言/拉黑/取消拉黑」菜单点击无任何效果

- **现象**：`group-member-list-item.vue` 菜单点击 emit `mute-member`/`unmute-member`/`block-member`/`unblock-member`，`group-member-list.vue` 原样向上 re-emit，但 `chat-info-drawer.vue` 挂载 `GroupMemberList` 时只监听 `chat-member`/`remove-member`/`set-admin`/`remove-admin`，四个事件无人接收；`useGroup().muteGroupMembers/blockGroupMembers` 已封装但没有任何 UI 接线。
- **证据**：`modules/group/group-member-list-item.vue:194-218`；`modules/group/group-member-list.vue:294-297`；`modules/chat/drawer/chat-info-drawer.vue:716-719`；`composables/use-group.ts:197,217`。
- **建议修法**：在 chat-info-drawer（或 chat.vue）补接四个事件，调对应 domain 并 toast；同步刷新 `groupMuteListMap/groupBlocklistMap`（可复用 D38 已补的 store 同步方法）。
- **修复**：已于 2026-07-28 修复。`chat-info-drawer.vue` 挂载 `GroupMemberList` 处补接 `mute-member`/`unmute-member`/`block-member`/`unblock-member` 四个事件，调 `useGroup()` 对应方法并 toast 结果，store 缓存同步复用 D38 补的 `groupMuteListMap/groupBlocklistMap` 同步链路。
- **关联 skill**：`uikit-contact-group-capabilities`

### [x] D42. 历史消息加载失败后永久显示「没有更多历史消息」，无重试入口

- **现象**：`loadMoreHistory` 的 `catch` 直接 `hasMoreHistory.value = false`，顶部指示器据此渲染「没有更多历史消息」，把一次瞬断网络错误呈现为历史已加载完；且不重进会话无法恢复。
- **证据**：`modules/chat/message-list/message-list.vue:236-239`（catch 置 false）、`:576-581`（顶部指示器渲染）。
- **建议修法**：catch 中保留 `hasMoreHistory`，显示「加载失败，点击重试」态。
- **修复**：已于 2026-07-28 修复。`message-list.vue` 历史加载失败不再把 `hasMoreHistory` 置 false，顶部指示器新增「加载失败，点击重试」态可重新触发加载；locale 补 `conversation.loadHistoryFailed` key（zh-CN/en 同步）。
- **关联 skill**：`uikit-store-composable`

### [x] D43. dataSource 分页（联系人/群组「加载更多」）整体断裂

- **现象**：`fetchContacts/fetchGroups` 拿到 dataSource 返回的 `hasMore/cursor` 后从不写入 store（store 的 `hasMore` 恒为初始 `false`）→ 列表永远显示「没有更多」或永不触发加载；即便手动把 `hasMore` 置 true，`loadMore()` 调 fetch 不传 cursor，且内部用 `setContactList` 整体替换 → 「加载更多」实际是「重新拉回第一页并覆盖列表」。
- **证据**：`composables/use-contact.ts:48-63,120-126`、`composables/use-group.ts:50-64,296-302`；`store/contact.ts:20`、`store/group.ts:35`（`hasMore` 恒 false）；已有的 `appendContactList/appendGroupList`（`store/contact.ts:34`、`store/group.ts:42`）未被使用。
- **建议修法**：fetch 时把 `result.hasMore/cursor` 落 store；loadMore 传 cursor 并改用 append 方法。
- **修复**：已于 2026-07-28 修复。`fetchContacts/fetchGroups` 将 dataSource 返回的 `hasMore/cursor` 写入 store；`loadMore()` 传 cursor 并改用已有的 `appendContactList/appendGroupList` 增量追加，联系人/群组「加载更多」真正翻页而非重拉第一页覆盖。
- **关联 skill**：`uikit-store-composable`

### [x] D44. 联系人/群组搜索词与选中态是全局单例，跨组件互相污染

- **现象**：`contact-list.vue` 搜索 keyword 直接读写 `contactStore.filterText`，选中态读写 `contactStore.selectedIds`；ContactList 被通讯录、`new-chat-modal`、`create-group-modal`、`invite-member-modal`、转发弹窗等多处复用——在「邀请成员」弹窗里搜过的词、A 弹窗的选中集合会残留到 B 处。group-list 同构。
- **证据**：`modules/contact/contact-list.vue:135,158-161`；`modules/contact/new-chat-modal.vue:104`、`modules/group/create-group-modal.vue:183`、`modules/group/invite-member-modal.vue:90`；`modules/group/group-list.vue:129,140`。
- **建议修法**：搜索词/选中态默认组件本地，仅显式需要共享时走 props。
- **修复**：已于 2026-07-28 修复。`contact-list.vue`/`group-list.vue` 的搜索 keyword 与选中态改为组件本地状态，不再读写 store 全局单例；组件卸载时清理选中态，通讯录与各弹窗实例之间不再互相污染。
- **关联 skill**：`uikit-store-composable` / `uikit-component-authoring`

### [x] D45. EmIcon 硬编码 viewBox，17+ 个非 24 画布图标渲染裁切/空白

- **现象**：`icon.vue` 固定 `viewBox="0 0 24 24"`，而 icon-map 生成时只提取 `<svg>` 内部、丢弃原始 viewBox。实测非 24 画布的图标：`actions/loading_circle`(1024)、`misc/logo`(1024)、`misc/empty`(91x93)、`actions/loading_2`(48)、`audio-video/camera_fill_arrows`(32) 等 17 个 → 渲染出来是裁切一角或近乎不可见。
- **证据**：`components/icon/icon.vue:33`；`components/icon/icon-map.ts:23`。
- **建议修法**：icon-map 解析时保留每个 svg 的 viewBox，EmIcon 使用该值。
- **修复**：已于 2026-07-28 修复。`icon-map.ts` 解析时保留每个 svg 的原始 viewBox（map 值由 `string` 改为 `{ body, viewBox }`，缺省回退 `0 0 24 24`）；`icon.vue` 模板改为 `:viewBox` 绑定 + `v-html` 渲染 `body`，非 24 画布图标（loading_circle/logo/empty 等 17 个）不再裁切。
- **关联 skill**：`uikit-component-authoring`

### [x] D46. EmCell hover/active 背景层圆角用错 token，违反 cell 契约

- **现象**：`:hover::before` / `.is-active::before` 背景层的 `border-radius` 用 `--uikit-components-radius`（按钮/卡片 token），而非契约要求的 `--uikit-item-hover-radius` / `--uikit-item-active-radius`（`store/theme.ts` 运行时按 hoverStyle 写入）。主题切换 rounded/square 时，cell 根节点圆角变了但背景高亮层不变，视觉错位。
- **证据**：`components/cell/cell.vue:157-158`；`store/theme.ts:114-117`。
- **建议修法**：`:hover::before` 用 `var(--uikit-item-hover-radius)`，`.is-active::before` 用 `var(--uikit-item-active-radius)`。
- **修复**：已于 2026-07-28 修复。`cell.vue` 的 `:hover::before` 圆角改为 `var(--uikit-item-hover-radius, 0px)`，`.is-active::before` 改为 `var(--uikit-item-active-radius, 0px)`，与 `store/theme.ts` 运行时按 hoverStyle 写入的 token 对齐，主题切换 rounded/square 不再错位。
- **关联 skill**：`uikit-cell-contract`

### [x] D47. action-sheet 直写 `env(safe-area-inset-bottom)`：与 popup 双重叠加且 safeArea 开关关不掉

- **现象**：`action-sheet.vue` 直接 `padding-bottom: env(safe-area-inset-bottom)`，违反「组件禁止直接 env()，须走 `--uikit-safe-bottom`」硬规则；它经 `Popup position="bottom"` 渲染，popup 已加 `var(--uikit-safe-bottom)` → 底部 ActionSheet 在刘海屏上安全区 padding 算两次；Provider `safeArea=false` 只覆写 CSS 变量，管不到直接写的 `env()`，即「safeArea=false 时关不掉 action-sheet」。
- **证据**：`components/action-sheet/action-sheet.vue:76`；`components/popup/popup.vue:296`；`containers/uikit-provider/uikit-provider.vue:202-208`。
- **建议修法**：`action-sheet.vue:76` 改为 `var(--uikit-safe-bottom, 0px)` 或直接删除该行复用 popup 的 safe-bottom，二者只留一份。
- **修复**：已于 2026-07-28 修复。`action-sheet.vue` 删除直写的 `padding-bottom: env(safe-area-inset-bottom)`（留注释说明），安全区 padding 统一复用 popup 已有的 `var(--uikit-safe-bottom)`；刘海屏双重叠加消除，Provider `safeArea=false` 也能正常关掉。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D48. 键盘高度公式漏算 `visualViewport.offsetTop`，iOS 上输入框与键盘之间出现空隙

- **现象**：`keyboardHeight = window.innerHeight - visualViewport.height` 未减 `offsetTop`；iOS Safari 键盘弹起时常偏移可视视口（`offsetTop > 0`），公式高估键盘高度，导致 message-input 的 `paddingBottom` 过大，输入框浮在键盘上方留出一条空带。另外 iOS < 13 无 `visualViewport`，`keyboardHeight` 恒 0，输入框被键盘完全盖住，无任何降级方案。
- **证据**：`composables/use-keyboard.ts:9-12`；`modules/chat/message-input/index.vue:517`。
- **建议修法**：公式补 `- (window.visualViewport?.offsetTop ?? 0)`；无 visualViewport 时降级用 `window.innerHeight` resize 差值。
- **修复**：已于 2026-07-28 修复。`use-keyboard.ts` 键盘高度公式补 `- (window.visualViewport?.offsetTop ?? 0)`；无 `visualViewport`（iOS < 13）时降级用 `window.innerHeight` resize 差值；另补 focusout 处理，避免部分 Android WebView 下 `keyboardHeight` 残留非 0。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D49. 键盘弹起时 safe-bottom 与 keyboardHeight 双重 padding，输入框被额外抬高 34px

- **现象**：chat-container 对整个聊天容器常驻 `padding-bottom: var(--uikit-safe-bottom, 0px)`（iPhone 刘海机 34px），message-input 又加 `paddingBottom: keyboardHeight px`；键盘弹起后键盘本身已覆盖 home 指示条区域，两份叠加使输入框最终停在键盘顶上方 34px 处，出现明显空隙。
- **证据**：`containers/chat-container/chat-container.vue:88`；`modules/chat/message-input/index.vue:517`。
- **建议修法**：键盘弹起（`isKeyboardOpen`）时移除/忽略 safe-bottom 那一份，二选一而非叠加。
- **修复**：已于 2026-07-28 修复。`chat-container.vue` 在键盘弹起态去掉 `padding-bottom: var(--uikit-safe-bottom)` 那一份，不再与 message-input 的 `keyboardHeight` padding 叠加，输入框贴合键盘顶。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D50. 键盘弹起后消息列表滚动有时序缺陷，最后几条消息仍被遮挡

- **现象**：`@focus` 瞬间立即 `scrollToBottom()`，滚的是键盘弹起前的旧布局；键盘高度计算延迟 300ms，输入框 padding 生效、消息列表收缩后未二次滚动，scrollTop 不变而 clientHeight 变小，最后几条消息被顶到输入框/键盘后面。SKILL 承诺的「保证键盘弹起后消息不被遮挡」达不到。
- **证据**：`modules/chat/chat.vue:845`（`@focus="messageListRef?.scrollToBottom()"`）；`composables/use-keyboard.ts:16`（300ms 延迟）；全仓无任何地方 watch `keyboardHeight` 后二次滚动。
- **建议修法**：chat.vue watch `h5.keyboardHeight`（或 `isKeyboardOpen`），变化后 nextTick 再调一次 `scrollToBottom()`。
- **修复**：已于 2026-07-28 修复。`chat.vue` 新增 `watch(h5.keyboardHeight)`，键盘高度变化后 nextTick 二次 `scrollToBottom()`，键盘弹起布局稳定后最后几条消息不再被遮挡。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D51. 弹层无背景滚动锁定，滚动穿透

- **现象**：Popup 全部代码无任何 body/容器滚动锁定（overlay 仅一张半透明 div），ActionSheet、Modal、转发弹窗、mention 半屏弹层打开时，手指在弹层上滑动会带动背后消息列表/会话列表滚动；iOS 上 `overflow:hidden` 锁 body 本身也防不住橡皮筋滚动。现有唯一的滚动锁在 use-long-press 且锁的是 body，对内部滚动容器无效。
- **证据**：`components/popup/popup.vue`（全文无滚动锁，overlay 见 `:221`）；`composables/use-long-press.ts:46-50`；`modules/chat/message-input/mention-picker.vue:127`。
- **建议修法**：Popup 在 `overlay && show` 时对背景滚动容器做锁定，或对 overlay/content 加 `touchmove` 拦截 + `overscroll-behavior: contain`。
- **修复**：已于 2026-07-28 修复。`popup.vue` 遮罩层加 `@touchmove.prevent`（声明式绑定，SSR 安全，内容区为遮罩兄弟节点、弹层内仍可滚动），`.uikit-popup__overlay` 与 `.uikit-popup__content` 均加 `overscroll-behavior: contain`；取「overlay 拦截 + overscroll contain」最简方案，未做 body 滚动锁以避免多弹层计数风险。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-component-authoring`

### [x] D52. `pullRefresh` 开关关不掉：手势始终生效，且消息列表完全绕过 Provider 配置

- **现象**：conversation-list 的 `effectivePullRefresh` 只用于控制指示器渲染，`usePullRefresh` 的 `onRefresh` 无条件调 `refreshConversations()`——用户传 `pullRefresh:false` 时下拉手势仍触发强制刷新，只是看不见提示；message-list 自己用 `'ontouchstart' in window || navigator.maxTouchPoints > 0` 判断触屏（正是 SKILL 禁止的「组件自己算」模式），`usePullRefresh` 也不读 `h5.enablePullRefresh`。
- **证据**：`modules/conversation/conversation-list.vue:78,96-104,295`；`modules/chat/message-list/message-list.vue:66-75,304-310`。
- **建议修法**：`usePullRefresh` 增加 `enabled` 参数；conversation-list 传 `effectivePullRefresh`，message-list 传 `h5.enablePullRefresh`。
- **修复**：已于 2026-07-28 修复。`usePullRefresh` 增加 `enabled` 参数；`conversation-list.vue` 传 `effectivePullRefresh`，`message-list.vue` 传 `h5.enablePullRefresh`，`pullRefresh:false` 时下拉手势不再触发刷新（两路均不再绕过 Provider 配置）。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D53. 滚动容器无 `overscroll-behavior`，自定义下拉刷新与浏览器原生手势冲突

- **现象**：库内 grep `overscroll-behavior|touch-action` 零命中；Android Chrome 在列表触顶继续下拉会触发浏览器原生下拉刷新/导航回弹（刷新的是整个页面），iOS 上触顶下拉带动整页橡皮筋，与自定义 pull-refresh 同时发生。
- **证据**：`modules/chat/message-list/message-list.vue:687-696`（`.message-list__scroll`）；`modules/conversation/conversation-list.vue:479-482`（`.conversation-list__items`）；`composables/use-pull-refresh.ts` 的 `useSwipe` 不做 `preventDefault`。
- **建议修法**：两个滚动容器加 `overscroll-behavior-y: contain`。
- **修复**：已于 2026-07-28 修复。`.message-list__scroll`（message-list.vue）与 `.conversation-list__items`（conversation-list.vue）均加 `overscroll-behavior-y: contain`，列表触顶下拉不再触发浏览器原生刷新/整页橡皮筋。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D54. 输入框 font-size 14px 触发 iOS 自动缩放，进一步打乱键盘计算

- **现象**：Input 组件 `font-size: 14px`，移动端单聊输入用的正是该组件；iOS Safari 对 font-size < 16px 的输入框 focus 时自动放大页面（宿主未禁缩放时），页面 zoom 后 `visualViewport.scale ≠ 1`，键盘高度差值在缩放坐标系下失真，键盘适配连带出错。demo 靠 `user-scalable=no` 压住，库消费者若不禁缩放必现。
- **证据**：`components/input/input.vue:134`；`modules/chat/message-input/simple-input.vue:54,382-392`；`composables/use-keyboard.ts:10`。
- **建议修法**：移动端（或全局）输入框 font-size ≥ 16px；或文档明确宿主需禁缩放（不推荐）。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`input.vue:200-204` 基础字号仍为 `--uikit-font-size-14`，但已加 `@media (hover: none), (max-width: 767px)` 移动端 16px 覆写（注释注明「移动端 iOS 对 <16px 输入框 focus 自动缩放，放大到 16px 规避」），宿主不禁缩放也不会被 iOS 放大。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D55. `100vh` 写死，移动浏览器地址栏场景高度错误

- **现象**：库内 popup/card-modal 用 `90vh`/`calc(100vh - 64px)`，demo 多处 `height: 100vh`，均无 `dvh`/`svh` 兜底；移动 Safari/Chrome 的 100vh 对应「地址栏隐藏后」的大视口，首屏（地址栏可见）时页面底部 ~60-80px 被裁到视口外，H5 单栏布局的底部 TabBar 直接被浏览器 chrome 挡住；横竖屏切换时 100vh 跳变亦无处理。
- **证据**：`components/popup/popup.vue:275`；`components/user-card/user-card-modal.vue:216`；`components/group-card/group-card-modal.vue:134`；apps/demo 内 `demo-page.vue:1141,1374`、`app.vue:163`、`login-page.vue:200`。
- **建议修法**：统一改 `100dvh`（或 `100vh` + `100dvh` 双声明兜底）。
- **修复**：已于 2026-07-28 修复。库内 `popup.vue`（`max-height: 90vh` 后追加 `90dvh`）与 `user-card-modal.vue`/`group-card-modal.vue`（`calc(100vh - 64px)` 后追加 `calc(100dvh - 64px)`）均改为 vh + dvh 双声明兜底；demo 侧多处 `100vh` 未在本期处理，后续随 demo 治理清理。
- **关联 skill**：`uikit-h5-adaptation`

---

## P2 · 局部 / 低风险

### [x] D8. 两套长按实现并存（自写 vs vueuse）

- **现象**：`composables/use-long-press.ts` 是自写 `setTimeout` 实现，`modules/conversation/conversation-item.vue` 又直接用 vueuse 的 `onLongPress`，功能重复。
- **修复**：2026-07 H5 适配专项中统一为 `useLongPress`，内部改用 vueuse `onLongPress`，并增加 touchmove 阈值（超过阈值取消长按）与长按时临时禁止 body 滚动，解决 H5 长按与页面滚动冲突。
- **关联 skill**：`uikit-store-composable` / `uikit-h5-adaptation`
- **验证**：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 通过。

### [x] D9. i18n：一处硬编码中文漏翻 + `t()` 无插值

- **现象 1**：`modules/chat/message-input/rich-input.vue` 语音提示 `{{ isRecording ? '松开结束录音' : '按住说话' }}` 硬编码中文，英文环境不翻译；而 `simple-input.vue`/`voice-panel.vue` 同处正确用了 `t('chat.voice.releaseEnd')` 等已存在的 key。
- **现象 2**：`useLocale().t(key)` 只做 map 查找 + key 兜底，**不做 `{placeholder}` 插值**；`'chat.pinnedBar.count': '{count} 条置顶消息'` 这类 key 需调用方自己 replace，易漏。
- **现象 3**（2026-07-28 复核新增）：`locale/index.ts:21` 的 `t()` 缺 key 时返回 key 名本身（truthy），全仓 `t('x') || '中文'` 写法（`components/presence-selector/presence-selector.vue:39-46`、`components/user-card/user-card-modal.vue:93-162`、`components/group-card/group-card-modal.vue:67-84` 等）的中文兜底是死代码——一旦新增 key 漏配，用户直接看到 `userCard.message` 这样的 key 名（当前引用 key 均存在，属机制隐患）。
- **现象 4**（2026-07-28 复核新增）：`components/modal/modal.vue:23-24`（取消/确认）、`components/action-sheet/action-sheet.vue:27`（取消）、`components/emoji-picker/emoji-picker.vue:18`（常用）硬编码中文默认值，完全不走 locale（locale 里已有 `button.confirm`/`button.cancel`）。
- **建议修法**：rich-input 改用既有 key；评估是否给 `t()` 加最小插值能力（`t(key, params)`）与 fallback 参数（`t(key, fallback)`），或统一约定调用方替换并在 skill 里写死；modal/action-sheet/emoji-picker 默认值改从 locale 取。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认四个现象均已修复，TECH-DEBT 漏勾）。现象 1：`rich-input.vue` 语音提示已改用 `t('chat.voice.releaseEnd')` 等既有 key（全仓 grep 无硬编码「松开结束录音/按住说话」）；现象 2：`locale/index.ts:42-46` 已有 `interpolate()`，`t(key, fallback?, params?)` 签名支持 `{placeholder}` 插值（`'chat.pinnedBar.count': '{count} 条置顶消息'` 可直接插值）；现象 3：全仓已改为 `t('key', '中文')` fallback 形式（presence-selector.vue:72-81、user-card-modal、group-card-modal 等），无 `t('x') || '中文'` 死代码；现象 4：`modal.vue:33-34`（取消/确认）、`action-sheet.vue:35`（取消）、`emoji-picker.vue:33`（常用）默认值均已 `t('button.cancel', '取消')` 形式走 locale + fallback。
- **关联 skill**：`uikit-i18n-locale`

### [x] D10. 模块层约 30% 组件用内联 `defineProps<{}>` 字面量而非命名 interface

- **现象**：components/containers 层 100% 用命名 `XxxProps` interface，modules 层约 12/42 文件内联字面量（集中在 `modules/contact/*`、`modules/group/*`）。不影响功能，但不利于 props 复用与文档化，lint 也抓不到。
- **建议修法**：新写强制命名 interface（skill 已约定）；存量可逐步收敛，非紧急。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认存量已全部收敛，TECH-DEBT 漏勾）。全仓 `defineProps<{` 内联字面量为 **0**，107 处 `defineProps` 均为命名 `XxxProps` interface（components/containers/modules 三层统一），props 文档化（gen:api）与复用不受影响。
- **关联 skill**：`uikit-component-authoring`

### [x] D11. `chat/message-input.vue` 与 `chat/message-input/` 目录并存，结构歧义

- **现象**：`modules/chat/` 下同时有顶层 `message-input.vue` 和 `message-input/` 目录（内含 rich/simple input 等），命名易混。
- **建议修法**：厘清职责后合并到目录内，或重命名顶层文件（如 `message-input-bar.vue`）。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已清理，TECH-DEBT 漏勾）。`modules/chat/` 下顶层 `message-input.vue` 已移除，仅剩 `message-input/` 目录（index.vue 统一导出 rich/simple/h5-input 形态）与 `h5-input/` 目录；全仓无任何 `message-input.vue` 路径引用残留。
- **关联 skill**：`uikit-component-authoring`

### [x] D12. 动效未接入变量的比例偏高

- **现象**：主题里有完整 `--uikit-anim-*` 体系（含 subtle/expressive/关闭/reduced-motion 开关），但组件里约 50 处 `transition` 用字面时长/缓动，绕过开关（只有 ~8 处 duration + ~12 处 easing 真正用了变量）。2026-07-28 复核补充：`components/button/button.vue:71-72`（150ms×2）、`components/action-sheet/action-sheet.vue:98`、`components/emoji-picker/emoji-picker.vue:91,134`、`components/user-card/user-card.vue:283`、`components/group-card/group-card.vue:187`、`components/presence-selector/presence-selector.vue:216`，`data-uikit-anim-enabled="false"` 和 reduced-motion 对这些无效。
- **建议修法**：过渡统一改用 `var(--uikit-anim-duration/easing)`，让全局动画开关真正生效。可与 D3 一起清。
- **进展**：2026-08-05 主题 Phase 1 已把 worst offenders 中的 `transition` 字面时长/缓动替换为 `var(--uikit-anim-duration)` / `var(--uikit-anim-easing)`，全局动画开关和 reduced-motion 现在对这些组件生效。剩余非高频文件中的 ~30 处仍待继续清理。
- **修复**：已于 2026-08-15 完成收尾。脚本批量替换剩余 **27 个文件 37 处**字面时长/缓动（`0.15s`/`0.18s`/`0.2s`/`0.22s`、`ease`/`linear`）为 `var(--uikit-anim-duration) var(--uikit-anim-easing)`，含多属性 transition 列表（如 `address-book-container` 的 `transform, opacity` 双段）；复检确认全仓 transition 无字面时长残留。全局动画开关（`data-uikit-anim-enabled=false`）与 `prefers-reduced-motion` 现对全部组件生效。
- **关联 skill**：`uikit-styling-theming`

### [x] D27. `invite-member-modal.vue` 和会话弹窗组件未从 barrel 文件导出

- **现象**：`invite-member-modal.vue` 已实现且被 `chat.vue` 内部导入使用，但未从 `group/index.ts` 导出。`new-chat-modal.vue`、`add-contact-modal.vue`、`create-group-modal.vue` 同理，仅被 `conversation-list.vue` 内部使用但未从 `conversation/index.ts` 导出。外部消费者无法独立使用这些组件。
- **证据**：`modules/group/index.ts` 无 `EmInviteMemberModal` 导出；`modules/conversation/index.ts` 仅导出 List/Item。
- **建议修法**：在 barrel 文件中补充导出：`group/index.ts` 加 `export { default as EmInviteMemberModal } from './invite-member-modal.vue'`；`conversation/index.ts` 加 `EmNewChatModal`/`EmAddContactModal`/`EmCreateGroupModal`。
- **修复**：已于 2026-07-28 修复。`modules/group/index.ts` 补 `EmInviteMemberModal` 导出；`modules/conversation/index.ts` 补 `EmNewChatModal`/`EmAddContactModal`/`EmCreateGroupModal` 导出，风格跟随现有 `export { default as ... }`。
- **关联 skill**：`uikit-component-authoring`

### [x] D28. `useBlocklist` 的 `if (!client.value)` 守卫为死代码且无错误处理

- **现象**：`client` 是 `shallowRef(host)`，`host` 是始终 truthy 的代理对象，`if (!client.value) return` 永远不触发。SDK 未初始化时通过代理访问会抛错而非被守卫拦截，且 `refresh()`/`addBlock()`/`removeBlock()` 没有 try/catch，导致未捕获的 Promise 拒绝。
- **证据**：`composables/use-blocklist.ts` L30-L53，三方法均有 `if (!client.value) return` 但 `client` 始终为代理对象。
- **建议修法**：移除无效守卫并添加 try/catch 错误处理，或改为检查 SDK 是否已初始化的真实标志。
- **修复**：已于 2026-07-28 修复。`use-blocklist.ts` 移除 3 处 `if (!client.value) return` 死守卫（client 是始终 truthy 的代理）；`refresh`/`addBlock`/`removeBlock` 各加 try/catch，失败时 `console.warn` 并 rethrow 不吞错误，store 更新仍在 await 成功之后。
- **关联 skill**：`uikit-store-composable`

### [x] D29. `logout()` 未清理事件处理器（`disposeEvents`）

- **现象**：`logout()` 清理了 `disposeUserInfoDomain` 并清空了所有 store，但未调用 `disposeEvents?.()`。登出到重新登录之间若有 SDK 事件，会向已清空的 store 写入。
- **证据**：`composables/use-uikit.ts` L197-L210，`logout()` 调用 `disposeUserInfoDomain?.()` 但未调用 `disposeEvents?.()`。
- **建议修法**：在 `logout()` 中添加 `disposeEvents?.()`。
- **修复**：已于 2026-07-28 修复。`use-uikit.ts` 的 `logout()` 在 `disposeUserInfoDomain` 之外补 `disposeEvents?.()`，两个引用均置 null。
- **关联 skill**：`uikit-store-composable`

### [x] D30. GroupDomain 残留 debug `console.warn`

- **现象**：`getGroupSharedFileList` 中有一行 `console.warn('[GroupDomain] getGroupSharedFileList result:', result)` 残留，每次调用群共享文件列表都会输出到控制台。
- **证据**：`sdk/domain/group-domain.ts` L270。
- **建议修法**：删除该行。
- **修复**：已于 2026-07-28 修复。删除 `sdk/domain/group-domain.ts` 的 `getGroupSharedFileList` 中残留的 `console.warn('[GroupDomain] getGroupSharedFileList result:', result)` debug 行。
- **关联 skill**：`uikit-lint-governance`

### [x] D31. Provider `features` 对象非响应式，运行时切换 prop 无效

- **现象**：`features` 是 setup 时创建的静态对象（`{ ...defaultFeatures, ...options.features }`），运行时切换 `enableContact`/`enablePresence` 等 prop 无效。Demo 设置面板支持运行时切换，但实际不生效。
- **证据**：`containers/uikit-provider/uikit-provider.vue` L107-L131 静态对象；`watch(isLoggedIn)` 从 `ctx.stores.client.isLoggedIn` 读取但 `features` 是静态值。
- **建议修法**：在 watch 中直接读取 `props` 而非静态 `features` 对象，或将 `features` 改为 `computed`。
- **修复**：已于 2026-07-28 修复。`uikit-provider.vue` 的 `features` 改为 `computed`，运行时切换 `enableContact`/`enablePresence` 等 prop 即刻生效，demo 设置面板的运行时切换恢复可用。
- **关联 skill**：`uikit-store-composable`

### [x] D32. `useRipple` 永久修改目标元素样式

- **现象**：`pointerdown` 时设置 `overflow: hidden` 和可能的 `position: relative`，动画结束后不恢复。依赖 `overflow: visible` 的元素（下拉/tooltip/徽章溢出）会被永久裁剪。
- **证据**：`composables/use-ripple.ts` L56-L63 设置样式，L66-L68 `onEnd` 回调仅 `ripple.remove()` 不恢复样式。
- **建议修法**：保存原始 `overflow` 和 `position` 值，在 `animationend` 回调中恢复。
- **修复**：已于 2026-07-28 修复。`use-ripple.ts` 新增 `activeRipples` 计数与 `originalPosition`/`originalOverflow` 记录，最后一个波纹动画结束（计数归零）时恢复原始样式；计数方案避免连续点击时先结束的波纹提前恢复、影响仍在进行的波纹。
- **关联 skill**：`uikit-styling-theming`

### [x] D33. `translateTextMessage` 未对 `result.translations` 做空值检查

- **现象**：`const translation = result.translations[0]` 假设 `result.translations` 一定存在且为数组。SDK 返回结构不含 `translations` 字段时会抛 `TypeError`。
- **证据**：`composables/use-message-actions.ts` L104-L108。
- **建议修法**：`const translation = result?.translations?.[0]`。
- **修复**：已于 2026-07-28 修复。`use-message-actions.ts` 改为 `result?.translations?.[0]`，空值走已有 else 分支复位 `setTranslating(msgId, false)`，SDK 返回缺 `translations` 字段不再抛 TypeError。
- **关联 skill**：`uikit-store-composable`

### [x] D34. `message-list.vue` 存在遗留 TODO 注释

- **现象**：`// TODO: 处理其他操作（转发）` 但转发功能已在 `chat.vue` 中通过 `ForwardModal` 完整实现，该 TODO 可能是遗留。
- **证据**：`modules/chat/message-list/message-list.vue` L392。
- **建议修法**：清理该 TODO 注释。
- **修复**：已于 2026-07-28 修复。删除 `message-list.vue` 中遗留的 `// TODO: 处理其他操作（转发）` 注释（转发功能已在 `chat.vue` 通过 `ForwardModal` 完整实现）。
- **关联 skill**：`uikit-lint-governance`

### [x] D36. Cell 类组件视觉不一致 + 重复代码（EmCell 已建，存量已收敛）

- **现象**：会话列表项、联系人项、群组项、群管理导航项、操作行等 cell 类组件的 padding/margin/圆角/transition 各写一套，视觉不统一。`contact-item-default.vue` 与 `group-item-default.vue` 代码 ~90% 重复。`group-management-section` 和 `chat-info-drawer` 的操作行未走 `--uikit-item-hover-*` 体系。
- **证据**：
  - `conversation-item.vue`：`padding: 12px var(...)` + `transition: background-color 0.15s`（硬编码）
  - `contact-item-default.vue` / `group-item-default.vue`：几乎相同的 props/CSS/模板，仅数据源不同
  - `group-management-section.vue` 操作行：`padding: 10px 12px` 硬编码，未走 `--uikit-item-hover-*`
  - `chat-info-drawer.vue` 群主操作行：同上
- **修复**：
  - `contact-item-default.vue`、`group-item-default.vue` 已基于 `EmCell` 重构；
  - `group-member-list.vue` 成员项、`create-group-modal.vue` 已选联系人、`presence-selector.vue` 选项、`block-list.vue` 成员项、`pinned-bar.vue` 展开项、`combine-message-modal-item.vue` 消息摘要项均已改用 `EmCell`；
  - `group-management-section.vue`、`chat-info-drawer.vue` 群主操作行已改用 `EmCell`，通过 `:inset-hover="false"` + 局部 `--uikit-item-hover-padding-x: 12px` + `--uikit-cell-height-compact: 40px` 实现卡片内操作项的顶满 hover 效果，并沉淀为 `uikit-cell-contract` 的「卡片内操作项模式」；
  - `conversation-item.vue` 的 transition 已改用 `var(--uikit-anim-duration/easing)`，其 `padding` 因 `auto-height` 模式需要保持 `12px var(...)`；
  - 所有 cell 类组件统一使用 `--uikit-item-hover-*` / `--uikit-anim-*` 变量。
- **关联 skill**：`uikit-cell-contract` / `uikit-component-authoring` / `uikit-styling-theming`

---

### [x] D37. 统一 UIKit 日志体系，替换直接 console 输出

- **现象**：UIKit 已新建 `utils/logger.ts` 但能力较薄（仅提供原始 `log`）；代码中仍存在多处直接 `console.warn` 等原生输出，且各模块没有统一命名空间、级别控制和运行开关，不利于问题排查和生产环境管控。
- **证据**：`packages/uikit-im/src/utils/logger.ts` 目前只有 `log`；`sdk/domain/group-domain.ts` L270 等仍有 `console.warn`；多个模块错误处理仅 `console.warn` 或无日志。
- **建议修法**：
  1. 扩展 `utils/logger.ts`：增加 `debug/info/warn/error` 级别、`createLogger(namespace)` 命名空间、`setLogLevel/getLogLevel` 全局开关、基于级别的过滤；
  2. 在 `UIKitClient` / `UIKitProvider` 初始化时根据 `debug` 配置自动设置日志级别；
  3. 按模块为 `client.ts` 和各 `domain`/`composable` 创建 `createLogger('UIKit:xxx')`，替换所有 `console.warn`；
  4. 版本输出等需要自定义样式的地方仍保留 `log` 作为底层输出能力。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认建议 1/3/4 已落地，建议 2 本轮补接线，TECH-DEBT 漏勾）。现状：`utils/logger.ts` 已完整实现四级 `debug/info/warn/error` + `createLogger(namespace)` + `setLogLevel/getLogLevel` 全局开关 + `setLogCollector` sink（全量日志经 `logger-binding.ts` 接入 `log-store.ts` IndexedDB 持久化，超出原建议）；全仓 22 处 `createLogger('UIKit:xxx')` 命名空间（composables/sdk/domain/client），原生 `console.warn` 残留仅 `log-store.ts:148` 一处（独立通用内核，注释声明设计如此）；`log` 保留为底层自定义样式输出。**本轮补建议 2**：`uikit-provider.vue` 的 `logger.uikitLevel` prop 此前只控制持久化收集级别（`configureLogPersistence`），未控制 console 输出级别——已在同 watch 中接线 `setLogLevel(loggerConfig?.uikitLevel ?? 'info')`，生产 'info'、排查临时调 'debug' 即时生效（含运行期切换）。SDK 日志级别走 `sdk-log-capture.ts` 的 `setLogLevel('DEBUG')` 捕获链路，独立于 UIKit 层。
- **关联 skill**：`uikit-lint-governance` / `uikit-store-composable`

---

### [x] D35. H5 集成体验改进（demo 集成时反向发现）

- **现象 1**：`EmConversationContainer` 未暴露「用户点击某会话」事件供 H5 页面栈导航。内部 `conversation-list` emit 了 `@select`，容器层只 emit `conversation-select`，且选中后直接调 `selectConversation()` 设置 currentConversationId。H5 场景只能 watch `stores.conversation.currentConversationId` 间接实现推页面栈，不够直观。
- **现象 2**：`EmContactContainer` 的 `@contact-click` / `@group-click` 事件只告知「谁被点了」，不管导航。H5 业务需自己管页面跳转，缺少标准做法示例。
- **现象 3**：`EmPopup` `position="bottom"` 时无 `max-height` 约束，H5 弹出会占满全屏，需业务侧自行加 `max-height` + 圆角。
- **现象 4**：`h5.fontScale` 目前纯占位，设值后无组件消费 `--uikit-font-scale` 做字号缩放，文档应标注「暂未生效」避免误解。
- **现象 5**：缺乏官方 H5 集成示例 / guide 页面，业务方从零摸索成本高。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认四个现象均已修复，TECH-DEBT 漏勾）。现象 1：`conversation-container.vue:81,104-106` 已暴露 `conversation-select` 与 `conversation-click` 事件；现象 2：`contact-container.vue:220,226,378,447` 已暴露 `contact-click` / `group-click`；现象 3：`popup.vue:370-372` bottom 弹出层已加 `max-height: 80vh` + `padding-bottom: var(--uikit-safe-bottom)`；现象 4：`uikit-provider.vue:420-423` 已把 `h5.fontScale` 接线到 `themeStore.setFontSizeScale`（写入 `--uikit-font-scale` 驱动字号 token），`apps/docs/guide/h5-adaptation.md:32` 已更新为「已由主题字号体系接管，建议使用 theme.fontSize」；现象 5：官方 H5 适配指南页 `apps/docs/guide/h5-adaptation.md` 已存在（安全区/键盘/下拉刷新/长按）。
- **建议修法**：
  1. `EmConversationContainer` 增加 `@conversation-click` 事件或文档说明 H5 导航标准模式；
  2. `EmPopup` bottom 模式自动限制 `max-height: 85vh` + 顶部圆角；
  3. `h5.fontScale` 文档标注 P2 预留暂未生效；
  4. 补充 H5 集成 guide 或 demo 页面。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-component-authoring`

### [x] D56. 已读状态可被送达回执降级

- **现象**：`onMessageDelivered` 无条件 `updateMessageStatus(id, 'delivered')`，store 无状态机守卫。已读回执先到、送达回执后到时，消息从 `read` 退回 `delivered`。
- **证据**：`sdk/event/chat-events.ts:188-191`；`store/message.ts:194-197`。
- **建议修法**：加状态序（sending<sent<delivered<read）只升不降。
- **修复**：已于 2026-07-28 修复。`store/message.ts` 引入 `STATUS_ORDER`（sending < sent < delivered < read）状态机，`updateMessageStatus` 只升不降，后到的送达回执不再把已读消息降级回 delivered。
- **关联 skill**：`websdk2-uikit-migration`

### [x] D57. `clearConversationMessages` 清理键错位，合并消息缓存泄漏

- **现象**：用 `conversationId` 删 `parsedCombineMessageMap`，但该 map 以 **messageId** 为键。清会话/删会话后解析过的合并消息（含大 `messageList`）永远残留，且下次同 messageId 会读到陈旧数据。`pinnedMessageMap`、`atMeMessageMap` 按 conversationId 是对的，只有这处错。
- **证据**：`store/message.ts:289`（对比 `:27,46-52` 的键定义）。
- **建议修法**：清会话时遍历该会话消息 id 逐键删除，或将 `parsedCombineMessageMap` 改为按 conversationId 分组存储。
- **修复**：已于 2026-07-28 修复。`store/message.ts` 的 `clearConversationMessages` 改为按该会话消息的 messageId 逐键清理 `parsedCombineMessageMap`，清会话/删会话后合并消息缓存（含大 `messageList`）不再残留。
- **关联 skill**：`uikit-store-composable`

### [x] D58. `sendChannelAck` 无未读守卫、每次选会话调用两次且无节流

- **现象**：注释自称「内部已做未读数为 0 跳过」，实际 domain 直接调 SDK 无任何守卫；`conversation-list` 的 handleSelect 与 `chat.vue` 的 watch currentConversation 同一次点击各调一次 → 重复请求；当前会话每来一条消息就发一次 `clearConversationUnreadMessageCount`，无节流，高频群聊下是明显的协议请求放大。
- **证据**：`modules/chat/chat.vue:401,419`；`modules/conversation/conversation-list.vue:206-208`；`composables/use-conversation.ts:160-165` → `sdk/domain/conversation-domain.ts:126-129`；`sdk/event/chat-events.ts:159-171`。
- **建议修法**：补 `unreadCount === 0` 短路；去掉双调用中的一路；按会话做节流。
- **修复**：已于 2026-07-28 修复。`sdk/domain/conversation-domain.ts` 的 `sendChannelAck` 补 `unreadCount === 0` 短路，并按会话做 1s 节流；chat.vue 与 conversation-list 的双调用入口保留，但重复请求被 domain 层节流合并，高频群聊下的协议请求放大消除。
- **关联 skill**：`uikit-store-composable`

### [x] D59. UserInfoDomain 订阅队列可永久滞留

- **现象**：flush 进行中新 push 进 `subscribeQueue` 的 id，因 `subscribeFlushPromise` 非 null 直接返回，flush 结束后队列里的 id 没有任何后续触发，直到下一次外部调用 `subscribeUserInfos` 才会被捎带 flush。
- **证据**：`sdk/domain/user-info-domain.ts:115-121`。
- **建议修法**：flush 结束（finally）后检查队列非空再排一轮。
- **修复**：已于 2026-07-28 修复。`sdk/domain/user-info-domain.ts` 的 flush 结束后检查 `subscribeQueue` 非空则再排一轮，flush 进行中新 push 进来的 id 不再滞留到下一次外部调用。
- **关联 skill**：`uikit-store-composable`

### [x] D60. presence watch 订阅失败被静默且不重试

- **现象**：`void subscribePresence(...)` 无 catch（unhandled rejection）；`current` 乐观更新，订阅失败的 id 不会再补订阅，在线状态就此缺失且无感知。
- **证据**：`composables/use-presence.ts:85-87,91-95`。
- **建议修法**：补 catch，失败时回滚乐观更新并重试订阅。
- **修复**：已于 2026-07-28 修复。`composables/use-presence.ts` 的 `subscribePresence` 调用补 catch，订阅失败时移除失败 id（不再乐观保留），后续触发可重新订阅，在线状态不再静默缺失。
- **关联 skill**：`uikit-store-composable`

### [x] D61. 群已读回执链路断链：`needReadReceipt` 未接通 + 已读弹窗未读列表恒空

- **现象 1**：`_enableGroupAck` 算完即弃，发送时从不设置 `needReadReceipt`（注释自承「未接通」），对端收不到回执请求 → `onMessageReadReceipts` 群聊分支的 `groupReadCount` 永远是初始值。
- **现象 2**：群已读弹窗「未读列表」`modalUnreadList.value = []` 硬编码，未读 Tab 永远空（注释自承认未接群成员差集）。
- **证据**：`composables/use-message-send.ts:35-48`；`sdk/event/chat-events.ts:198-202`；`modules/chat/message-list/message-list.vue:449-458`。
- **建议修法**：发送时按开关设置 `needReadReceipt`，未读列表接群成员差集；或下掉 UI 上的已读人数/未读 Tab 展示。
- **修复**：现象 1 已于 2026-07-28 早些时候修复（`use-message-send.ts` 发送群消息按开关接通 `needReadReceipt`）。现象 2 已于 2026-07-28 修复：`message-list.vue` 的 `onGroupReadClick` 未读列表改为「群成员 − 已读 − 消息发送者」差集——成员优先取 `stores.group.getGroupMembers` 缓存，缺失时 `fetchGroupMembers` 拉取一页后重取；成员拉取失败降级为未读列表为空（不影响已读 Tab）。
- **关联 skill**：`websdk2-uikit-migration` / `uikit-store-composable`

### [x] D62. 删除会话默认连漫游消息一起删

- **现象**：`deleteConversation(id, deleteRoamingMessages = true)` 且会话列表弹窗默认勾选删除历史。删除会话的默认行为是清掉服务端漫游消息（影响所有设备），与主流 IM「删除会话≠删历史」的默认相反。
- **证据**：`composables/use-conversation.ts:177`；`modules/conversation/conversation-list.vue:230-234`。
- **建议修法**：默认改 `false`，弹窗默认不勾选删除历史。
- **修复**：已于 2026-07-28 修复。`use-conversation.ts` 的 `deleteConversation` 默认 `deleteRoamingMessages` 改为 `false`（注释同步改为「默认保留漫游消息，删除会话≠删历史」）；`conversation-list.vue` 删除弹窗的 `deleteWithHistory` 初始值及 `handleDelete` 重置值均改为 `false`，默认不再勾选删除历史。
- **关联 skill**：`uikit-store-composable`

### [x] D63. 会话切换即已读，不判断页面可见性

- **现象**：当前会话收到消息立即清未读，不看 `document.visibilityState`。页面在后台标签时消息被标记已读，用户实际并未看到。
- **证据**：`sdk/event/chat-events.ts:159-171`。
- **建议修法**：清未读前判断页面可见性，不可见时保持未读。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`sdk/event/chat-events.ts:374-395` onMessage 清未读已加 `isPageVisible = document.visibilityState === 'visible'` 守卫（注释「仅在页面可见时标记已读；页面隐藏时用户实际未看到，保持未读」），后台标签收消息不再清未读。
- **关联 skill**：`uikit-store-composable`

### [x] D64. token 过期无对外回调

- **现象**：`onTokenWillExpire/onTokenExpired` 只打日志，UIKit 未向应用层暴露刷新 token 的钩子，过期后用户无感知地断链。
- **证据**：`sdk/event/connection-events.ts:33-40`。
- **建议修法**：通过 provider options 暴露 `onTokenWillExpire/onTokenExpired` 回调。
- **修复**：已于 2026-08-15 核销（2026-08-15 消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。链路完整：`EmUIKitProvider` props `onTokenWillExpire/onTokenExpired`（`uikit-provider.vue:139,141,243-246`）→ `useUIKit` options `connectionCallbacks`（`use-uikit.ts:114,245`）→ `registerEventHandlers`（`sdk/event/registry.ts:18-21`）→ `createConnectionHandlers` 触发 `callbacks.onTokenWillExpire?.()/onTokenExpired?.()`（`connection-events.ts:47-56`）。核销时补对外类型导出：`ConnectionEventCallbacks` 从 `sdk/index.ts` re-export（此前类型仅内部可见）。真实接入验证（业务侧刷新 token 后自动恢复）列入 CONSUMER-VALIDATION-CHECKLIST.md 阶段 B3 首个验证项。
- **关联 skill**：`websdk2-uikit-migration`

### [x] D65. `conversation-container` 的 `pageSize`/`includeEmptyConversations` 是死 props

- **现象**：声明并设默认值，但模板与逻辑中从未使用；实际加载走 `refreshConversations()` 和 `useConversation().loadMoreConversations(pageSize=50)`，`ConversationDomain.loadMore` 本身还是无分页的重读本地列表。
- **证据**：`containers/conversation-container/conversation-container.vue:12-14,56-58,89`；`composables/use-conversation.ts:131`；`sdk/domain/conversation-domain.ts:132-136`。
- **建议修法**：接上真实分页或删除死 props。
- **修复**：已于 2026-07-28 修复。按「删除死 props」方案处理：`conversation-container.vue` 移除从未使用的 `pageSize`/`includeEmptyConversations` 两个公开 props（公开 props 变更），加载路径统一走 `refreshConversations()` / `loadMoreConversations()`。
- **关联 skill**：`uikit-component-authoring`

### [x] D66. `contact-container` 废弃 props 兼容层失效

- **现象**：`props.showNotice ?? props.showNewRequest` 等四处；因 `withDefaults` 已给 `showNotice: true`、`noticeCount: 0`，`??` 右侧的 `showNewRequest/newRequestCount/newRequestLabel/newRequestIcon` 永远取不到，标注 `@deprecated` 的旧 props 传了也被静默忽略。
- **证据**：`containers/contact-container/contact-container.vue:270,273,278,281`（默认值见 `:158,161`）。
- **建议修法**：兼容判断改为「显式传了新 prop 才优先」，或直接删除旧 props。
- **修复**：已于 2026-07-28 修复。`contact-container.vue` 的 `showNotice`/`noticeCount` 默认值从 `withDefaults` 移入 computed，`props.showNotice ?? props.showNewRequest` 等 `??` 兼容链恢复生效，显式传旧 props（`showNewRequest`/`newRequestCount` 等）时正确兜底。
- **关联 skill**：`uikit-component-authoring`

### [x] D67. 会话自定义操作 `custom-action` 事件被吞

- **现象**：conversation-item 对无 handler 的自定义 action emit `custom-action`；conversation-list 未监听、未声明、未向上 re-emit → 外层拿 `customActions` 不传 handler 时点击无反应。
- **证据**：`modules/conversation/conversation-item.vue:46,176-181`；`modules/conversation/conversation-list.vue:63-66,302-317`。
- **建议修法**：conversation-list 声明并 re-emit `custom-action`。
- **修复**：已于 2026-07-28 修复。`conversation-list.vue` 的 emits 声明新增 `(e: 'custom-action', key, conversation)`，新增 `handleCustomAction` 向上 re-emit，模板 `ConversationItem` 挂 `@custom-action`；外层不传 handler 的自定义操作点击可达。
- **关联 skill**：`uikit-component-authoring`

### [x] D68. 群成员列表双数据源、事件不刷新

- **现象**：`group-member-list.vue` 自建 `localMembers` 本地副本；`MEMBERS_JOINED/EXITED` 事件只更新 store，打开中的成员列表不刷新；chat.vue 邀请成功后 `chatInfoDrawerRef.value?.refreshMemberList()` 在二级页未打开时是 no-op，抽屉头像九宫格（读 store）与成员页（读 localMembers）可能不一致。
- **证据**：`modules/group/group-member-list.vue:80-81,171-174`；`sdk/event/group-events.ts:75-94`；`modules/chat/chat.vue:586`。
- **建议修法**：成员列表统一读 store，移除 `localMembers` 副本。
- **修复**：已于 2026-07-28 修复。`group-member-list.vue` 移除 `localMembers` 本地副本，成员列表统一读 store，`MEMBERS_JOINED/EXITED` 事件更新 store 后打开中的成员页即时刷新，与抽屉头像九宫格数据源一致。
- **关联 skill**：`uikit-store-composable`

### [x] D69. Popup 无键盘可访问性

- **现象**：全文无 ESC 关闭、无 focus trap、无 `role="dialog"`/`aria-modal`，键盘/读屏用户无法关闭弹层。
- **证据**：`components/popup/popup.vue`。
- **建议修法**：至少加 ESC → close（可配 prop），补 `role="dialog"`/`aria-modal`。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`popup.vue` 已有 `useEscToClose`（`closeOnEsc` prop 可配，L207）+ 模板 `role="dialog"`/`:aria-modal="props.overlay"`（L287-288）。focus trap 未实现（需引入 focus-trap 依赖，属增强项，可另立条目）。
- **关联 skill**：`uikit-component-authoring`

### [x] D70. 弹层关闭事件重复触发链

- **现象**：popup 遮罩点击同时 emit `update:show` + `close`；user-card-modal 两个 handler 各自再 emit `update:show(false)` → 消费者收两次；presence-selector-modal 更糟：setter 发 close，`@close→onCancel` 又走一次 setter → `close` 发两次，`onPresenceSelectorClose` 连带 `loadData()` 跑两遍。
- **证据**：`components/popup/popup.vue:159-162`；`components/user-card/user-card-modal.vue:170-175,183-184`；`components/presence-selector/presence-selector-modal.vue:26-33,46-48`。
- **建议修法**：Popup 只 emit `update:show`，`close` 由消费者自行推导；或 modal 层去掉重复转发。
- **修复**：已于 2026-08-15 核销 + 补修。`user-card-modal.vue` 已修（`onClose` 注释明确「Popup 的 close 事件已携带 update:show(false)，不再重复 emit」，只发 `close`）；**本轮补修 `presence-selector-modal.vue`**：移除 `showModel` computed setter 的重复转发（原 `@update:show → setter → 再 emit` 导致 `update:show` 双发），改为 Popup `@update:show` 直接转发 + `@close` 转发，`onCancel` 显式 `emit('update:show', false)` + `emit('close')` 各一次；消费者 `update:show`/`close` 均单发。
- **关联 skill**：`uikit-component-authoring`
- **关联 skill**：`uikit-component-authoring`

### [x] D71. Avatar 图片加载失败无占位

- **现象**：`img` 无 `@error` 处理，src 404 时显示破图图标而非回退到名字文字。
- **证据**：`components/avatar/avatar.vue:64`。
- **建议修法**：加 `imgError` ref，error 后切到文字分支。
- **修复**：已于 2026-07-28 修复。`avatar.vue` 新增 `imgError` ref，img 改 `v-if="props.src && !imgError"` + `@error="imgError = true"`，加载失败回退到文字头像分支；`watch(() => props.src)` 重置错误态。
- **关联 skill**：`uikit-component-authoring`

### [x] D72. user-card 点头像 `presence-click` 触发两次

- **现象**：`onAvatarClick`（editable 时 emit presence-click）与模板上的 `@presence-click` 转发（Avatar 内部点击也 emit）叠加 → 一次点击 emit 两次。
- **证据**：`components/user-card/user-card.vue:76-80,104`；`components/avatar/avatar.vue:51-54`。
- **建议修法**：只保留 Avatar 内部那一路。
- **修复**：已于 2026-07-28 修复。`user-card.vue` 的 `onAvatarClick` 不再 emit `presence-click`（Avatar 内部点击已 emit、经模板 `@presence-click` 转发一路），只保留 `avatar-click`，一次点击不再触发两次。
- **关联 skill**：`uikit-component-authoring`

### [x] D73. Input 死 prop `rows` 与变体无条件缩进

- **现象**：`rows` 声明后从未使用（无 textarea 分支）；search/filled/ghost/underline 变体无条件 `padding-left: 28px`，未传 `prefixIcon` 时文字莫名缩进。
- **证据**：`components/input/input.vue:12,154,172,191,211`。
- **建议修法**：删 `rows`；缩进只在有 prefix icon 时加。
- **修复**：已于 2026-07-28 修复。`input.vue` 删除从未使用的 `rows` prop（全仓无调用方）；search/filled/ghost/underline 四变体去掉无条件 `padding-left: 28px`，有 prefixIcon 时由 `.uikit-input--with-prefix`（优先级更高）接管缩进，渲染结果与改前一致。
- **关联 skill**：`uikit-component-authoring`

### [x] D74. emoji-picker 关闭能力薄弱

- **现象**：只能靠右上角 × 关闭，无遮罩、无外部点击关闭、select 后不收起（也不提供该选项）。
- **证据**：`components/emoji-picker/emoji-picker.vue:49`。
- **建议修法**：加 `closeOnSelect` / 外部点击关闭，或明确由 Popup 包裹使用。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`emoji-picker.vue` 已有 `closeOnSelect` prop（默认 false，select 后经 `emit('update:show', false)` 收起）+ 右上角关闭按钮；外部点击关闭由 Popup 包裹（`close-on-click-overlay`）提供，组件自身 `update:show` 受控。
- **关联 skill**：`uikit-component-authoring`
- **关联 skill**：`uikit-component-authoring`

### [x] D75. 弹层 z-index 体系单薄

- **现象**：所有弹层默认 zIndex 2000，toast 硬编码 9999。嵌套弹窗（user-card-modal → presence-selector-modal）同级靠 DOM 顺序取胜，非常规关闭顺序下有被压风险。
- **证据**：`components/popup/popup.vue:31`；`components/toast/toast.vue:45`。
- **建议修法**：引入递增 z-index 管理。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`utils/z-index.ts` 已实现全局递增分配器（`nextZIndex()` 从 2000 起每次 +1 不复用，`resetZIndex()` 供测试/登出），`popup.vue` 打开时经 `allocatedZIndex = nextZIndex()` 取递增 z-index，后开弹层必在上层；toast 9999 保持（Toast 独立于弹层体系，须恒高于所有弹层）。
- **关联 skill**：`uikit-component-authoring`
- **关联 skill**：`uikit-component-authoring`

### [x] D76. presence-selector 空自定义文本可提交

- **现象**：`onConfirmCustom` trim 后为空也 emit `select('custom', '')`。
- **证据**：`components/presence-selector/presence-selector.vue:79-82`。
- **建议修法**：空值禁用或回退。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`onConfirmCustom`（L123-129）已 `const text = customText.value.trim(); if (!text) return` 空值短路，不再提交空自定义文本。
- **关联 skill**：`uikit-component-authoring`
- **关联 skill**：`uikit-component-authoring`

### [x] D77. 移动端强制 simple 输入模式，tiptap 富文本配置被静默忽略

- **现象**：`isMobile` 时 `inputMode` 强制 `'simple'`，用户配 `mode:'rich'` 无任何警告地被丢弃；同时移动端只有单行 input，多行长文本输入体验差（tiptap 编辑器在移动端根本不会出现，属能力阉割）。
- **证据**：`modules/chat/message-input/index.vue:85-90`；`modules/chat/message-input/simple-input.vue:54`。
- **建议修法**：至少文档注明或在 rich 被丢弃时 warn；或提供 multi-line 移动端形态。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`modules/chat/message-input/index.vue:108-115` 移动端 + `mode:'rich'` 时已 `logger.warn('[MessageInput] 移动端已强制使用 H5Input，mode=rich 配置被忽略')`，不再是静默丢弃；「移动端固定渲染 H5Input，不走 simple/rich 分支」已有注释说明。文档标注本轮补充：`apps/docs/guide/h5-adaptation.md` 新增「输入框模式」小节。multi-line 移动端形态仍属能力缺口，如需支持另立新条目。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D78. 长按滚动锁对真实滚动容器无效，`preventScroll` 名不副实

- **现象**：`use-long-press.ts` 锁 `document.body.overflow`，而消息列表/会话列表是内部容器滚动，锁不住；实际防冲突只靠 10px `moveThreshold`。功能上可用，但 `preventScroll` 选项名不副实。
- **证据**：`composables/use-long-press.ts:42-52`。
- **建议修法**：锁定实际滚动容器，或文档/命名说明只锁 body。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`use-long-press.ts` JSDoc 已明确「`preventScroll` 仅锁 body，对内部滚动容器无效，防冲突主要依赖 `moveThreshold`」（L8-9），命名/文档说明已补，与实现一致。
- **关联 skill**：`uikit-h5-adaptation`
- **关联 skill**：`uikit-h5-adaptation`

### [x] D79. 虚拟滚动模式下拉加载静默失效

- **现象**：`usePullRefresh(listRef, ...)`，而消息数 > 100 时走 `MessageVirtualList`，`listRef` 不存在，下拉手势无目标；仅靠虚拟列表 `reach-top` 兜底，与 pull 指示器逻辑脱节。
- **证据**：`modules/chat/message-list/message-list.vue:304,565,584`。
- **建议修法**：虚拟滚动模式下禁用自定义下拉刷新指示，或把手势挂到虚拟列表容器。
- **修复**：已于 2026-07-28 修复。`message-list.vue` 在消息数走 `MessageVirtualList`（虚拟滚动）时禁用自定义下拉刷新手势与指示，仅保留虚拟列表 `reach-top` 加载兜底，两条加载路径不再脱节。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D80. popup 自监听 window resize，违反「统一从 useUIKit().h5 取」规则

- **现象**：`useEventListener(window, 'resize', ...)`（用于锚定重定位），与 SKILL「组件禁止自监听 resize/visualViewport」的硬规则冲突。
- **证据**：`components/popup/popup.vue:147-149`。
- **建议修法**：改为订阅 `h5.viewport`。
- **结论（2026-08-15 消费者验证准备时评估）**：**有意保留**。`Popup` 是完全独立的基础组件（仅依赖 vue/vueuse/locale/key-bindings/z-index，不依赖 UIKitContext，可脱离 provider 单独使用），锚定模式（传 `anchor`）下的 resize 监听是「锚点重定位跟随窗口变化」的组件级职责，与 H5 适配的全局 viewport 监听（安全区/键盘/尺寸）用途不同；`useEventListener` 由 vueuse 在作用域销毁时自动清理，无泄漏。SKILL「组件禁止自监听 resize/visualViewport」的规则适用范围应为**依赖 provider 的业务组件**（避免重复监听），不适用于自包含基础组件。维持现状，文档/skill 已注明边界。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D81. `safeArea` 开关非响应式，运行期改 `:h5` prop 不生效

- **现象**：`uikit-provider.vue` 只在 `onMounted` 覆写一次；`use-uikit.ts` 把 `options.h5` 快照传入 `useH5Adaptation`，运行期改 `:h5` prop 不生效（与 D31 features 静态快照同源）。
- **证据**：`containers/uikit-provider/uikit-provider.vue:202`；`composables/use-uikit.ts:106`。
- **建议修法**：watch `props.h5` 变更重新应用覆写，或与 D31 一并改 computed。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`uikit-provider.vue:427-447` 已 `watch(() => props.h5?.safeArea)`：`false` 时把 `--uikit-safe-*` 四个变量强制覆写为 `0px`，恢复时 removeProperty；组件消费的是 CSS 变量（h5-input.vue:102,807、chat.vue:1323、message-list.vue:966、conversation-list.vue:665,796），覆写链路生效，运行期切换 `:h5="{ safeArea }"` 即时生效。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D82. emoji 面板写死 320px，窄屏溢出宽屏留白

- **现象**：`.emoji-picker-wrapper` 与 emoji-picker 固定 `width: 320px`，≤320px 窄屏溢出、宽屏底部弹层两侧留白，移动端底部弹层内未做宽度适配。
- **证据**：`modules/chat/message-input/index.vue:624`；`components/emoji-picker/emoji-picker.vue:69`。
- **建议修法**：宽度改 `min(320px, 100vw)` 或弹层内自适应。
- **修复**：已于 2026-08-15 核销（消费者验证准备时核查确认已实现，TECH-DEBT 漏勾）。`components/emoji-picker/emoji-picker.vue:140-141` 与 `modules/chat/message-input/index.vue:830-832` 的 `.emoji-picker` / `.emoji-picker-wrapper` 均已有 `width: 320px; max-width: calc(100vw - 24px)`，窄屏（≤320px）由 max-width 兜底不溢出。
- **关联 skill**：`uikit-h5-adaptation`

### [x] D83. hover 态移动端残留

- **现象**：大量 `:hover` 样式未包 `@media (hover: hover)`，移动端 tap 后 hover 态粘住（均有 `:active` 部分兜底，影响有限）。
- **证据**：`modules/conversation/conversation-item.vue:444`；`modules/chat/message-input/simple-input.vue:499` 等。
- **建议修法**：`:hover` 规则统一包 `@media (hover: hover)`。
- **修复**：已于 2026-08-15 修复。缩进感知脚本检测全仓**未包裹的顶层 `:hover` 规则 39 处**（16 个文件：icon-button 16 / cell 4 / contact-notice-list 3 / chat-info-drawer 2 / multi-select-bar 2 / group-member-list 2 等），批量包进 `@media (hover: hover) { ... }`（仅动包裹结构，属性不变）；其余组合选择器（如 `message-bubble-wrapper` 状态图标 hover）核查确认已在 `@media (hover: hover)` 内。移动端 tap 不再粘住 hover 态（依赖 `:active` 兜底反馈），桌面悬停行为不变；构建无 CSS 警告、lint 清零。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-styling-theming`
- **关联 skill**：`uikit-h5-adaptation` / `uikit-styling-theming`

### [x] D84. 其他小项集合（2026-07-28 四路审查遗留）

- **现象/证据**：
  - `modules/chat/chat.vue:430` `fetchPinnedMessages()` 未 await 且无 catch，失败产生 unhandled rejection；
  - `composables/use-conversation.ts:8` 模块级 `draftCache` 只增不减（跨账号累积），logout 未调 `clearAllDrafts`；
  - `composables/use-message-actions.ts:9-10` 多选状态模块级单例，logout/切账号不重置（D15 只补了会话切换清理）；
  - `modules/chat/message-list/message-list.vue:149-183` 一批多条新消息到达时 `unreadNewCount` 只 +1（按 watch 次数而非条数）；
  - 媒体消息重发仍是 warn + 静默 return（D19 只修「先删后发」），`message-list.vue:438-446` 的 `onResend` 视为成功、无 toast，失败媒体消息的「重发」入口形同虚设；
  - `modules/chat/chat.vue:634-649` `onGroupCardSendMessage` 不校验是否已加入该群即建会话并跳转，发送必然失败且无前置提示；
  - `composables/use-keyboard.ts:15-17` 只在 focusin 后 300ms 重算，无 focusout 处理，部分 Android WebView 下 `keyboardHeight` 会残留非 0。
- **建议修法**：逐条小修（补 catch / logout 清理 / 入群校验 / focusout 重算），无架构改动。
- **修复**：已于 2026-08-15 逐条核销（消费者验证准备时核查 + 本轮补修，TECH-DEBT 漏勾/部分残留）：
  1. `fetchPinnedMessages` unhandled rejection——已修：`chat.vue` 会话进入处 `fetchPinnedMessages().catch(...)`（失败仅 warn 不阻断）。
  2. `draftCache` logout 清理——已修：`use-uikit.ts` logout 内调用 `clearAllDrafts()`（草稿 key 本身含 appKey+currentUser 维度，跨账号不串）。
  3. 多选状态 logout 重置——已修：`use-uikit.ts` logout 内调用 `resetMultiSelectState()`。
  4. `unreadNewCount` 按条数计数——已修：`message-list.vue:227` `+= newLen - (oldLen || 0)`。
  5. 媒体消息重发无反馈——**本轮修复**：`use-message-send.ts` `resendMessage` 媒体分支由静默 `return` 改为抛 `MEDIA_RESEND_UNSUPPORTED` 标识错误；`message-list.vue` `onResend` catch 识别后 toast「图片/语音/视频/文件消息暂不支持重发」（新增 locale key `message.resendMediaUnsupported`，zh/en 双语）。
  6. `onGroupCardSendMessage` 入群校验——已修：`chat.vue` 先 `stores.group.getGroupById(groupId)`，未加入则 toast「尚未加入该群」并 return。
  7. `useKeyboard` focusout 重算——已修：已有 `handleFocusOut`（300ms 延迟后归零/重算）。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-store-composable` / `uikit-message-rendering`
- **关联 skill**：`uikit-store-composable` / `uikit-lint-governance`

### [x] D85. 未来扩展：Electron + 本地数据库（SQLite）消息/会话持久化

- **背景**：未来 UIKit 有较大可能在 Electron 环境使用，消息/会话数据需外接本地 DB——登录后从库加载回流 UIKit（冷启动不依赖网络）、收发写库、翻页先读本地再漫游。
- **结论**：架构支持低侵入扩展（Domain 依赖注入 + store 已有 `setConversationList`/`prependMessages` 批量回流入口 + `toUiMessage` 形态对齐），缺持久化抽象接口、历史加载数据源分支、会话列表与 SDK 同步快照的覆盖竞争处理。**详细调研与落地建议见根 [ELECTRON-PERSISTENCE-RESEARCH.md](ELECTRON-PERSISTENCE-RESEARCH.md)（2026-08-05 预研）**。
- **核销（2026-08-15，转 roadmap）**：预研已完成且架构结论明确，实施需 Electron 项目场景（当前仓库无 Electron 验证环境，下周为 Web Demo）——待 Electron 项目立项后按预研步骤实施（持久化抽象接口 → dataSource 分支 → 覆盖竞争处理），非当前 Web UIKit 债务。
- **关联 skill**：`websdk2-uikit-migration` / `uikit-store-composable`

### [x] D86. 主题能力扩展：字号体系 / 适老版 / 密度 / 气泡色等语义 token

- **背景**：主题机制（变量契约 + `data-uikit-*` 驱动）健康，但覆盖面不足：字号 token 空白（357 处硬编码 px、`--uikit-font-scale` 只写不读）、无全局密度、气泡颜色等高频定制点无独立 token、Provider `theme` prop 偏窄（无 auto、非响应式）。
- **进展**：2026-08-06 Phase 2 完成核心链路：`theme/index.css` 新增 `--uikit-font-size-*` token 与 `--uikit-font-scale` 联动；`store/theme.ts` / `use-theme.ts` 新增 `fontSizeScale`、`setFontSize`（normal/large/xlarge）；`uikit-provider.vue` 支持 `theme.fontSize` 与 `theme.mode: 'auto'` 并响应式应用；`use-h5-adaptation.ts` 停止重复写 `--uikit-font-scale`；demo 外观面板加 标准/大/特大 三档切换；高频组件（chat/conversation/原子组件，45 个文件 144 处）字号已 token 化。2026-08-06 Phase 2.5 完成剩余低频文件字号 token 化：新增 `--uikit-font-size-8` token，57 个文件 207 处硬编码替换为字号 token，仅剩 4 处 story 内装饰性 emoji 尺寸保持 px。字号体系（除装饰性 emoji）已全覆盖，适老版切换可正常缩放。2026-08-06 Phase 3 完成高频语义 token：`theme/index.css` 新增 `--uikit-bubble-bg-other/self`、`--uikit-bubble-text-other/self`、`--uikit-chat-bg`、`--uikit-input-bg`；store 与 Provider 新增对应配置入口；text/file/voice/video/image/location/combine/custom 消息组件、聊天容器、输入区、时间分隔线全部接入语义 token；`--uikit-chat-bg` 使用 `background` 简写，默认可支持颜色/渐变/`url(...)` 图片背景。2026-08-06 Phase 4 完成 Provider 密度扩展：新增 `Density = 'compact' | 'normal' | 'comfortable'`，`theme/index.css` 通过 `[data-uikit-density]` 覆盖 `--uikit-cell-height*` / `--uikit-cell-padding-y` / `--uikit-list-gap` / `--uikit-header-padding-y`；`Cell` 默认/紧凑/大尺寸高度与 `auto-height` 内边距、`chat.vue` 头部内边距已接入；demo 外观面板加 紧凑/标准/宽松 三档切换。**后续可选项**：把密度变量扩展到输入区、消息气泡间距、抽屉内边距等更多组件。
- **关联 skill**：`uikit-styling-theming`
- **核销（2026-08-15）**：Phase 2（字号 token + font-scale + 适老档位）、Phase 2.5（剩余低频字号 token 化全覆盖）、Phase 3（气泡/聊天背景/输入区语义 token）、Phase 4（密度 compact/normal/comfortable + Provider 接线）均已完成并验证；剩余「密度变量扩展到更多组件」为可选优化，非债务。

### [x] D87. Demo 开发者友好模式（Dev Hints）：悬停展示环信接口 + 实现思路

- **背景**：demo 登录后默认开启教学覆盖层——悬停会话项/气泡等区域，浮出该功能用到的环信接口 + 文档链接 + UIKit 实现思路；气泡悬停延时出"点子"角标，点击展开详情抽屉。
- **实施（2026-08-06，uikit 零侵入）**：`apps/demo/src/dev-hints/` 三件套已落地——`types.ts`（类型定义）+ `registry.ts`（13 条元数据：会话列表/7 种类型气泡/通用气泡/历史消息/输入框/聊天容器，每条含环信接口 + 实现思路 + 参考文件；两轮匹配：具体内容优先，`.chat` 等容器级兜底）+ `use-dev-hints.ts`（`.demo-layout` 事件委托引擎：L0 悬停 200ms 出提示卡、L1 气泡 2s 出 💡 角标、离开后 300ms 延迟隐藏 + 移入覆盖层取消隐藏、scroll/resize 隐藏）+ `demo-dev-hint-card.vue`（提示卡 + 💡 角标 + EmPopup 右侧详情抽屉）。开关挂 `useDemoSettings` 新增 `devHintsEnabled`（默认开 + localStorage 记忆），设置抽屉新增「开发者」分类面板，移动端自动禁用。**待办**：5.x 官方文档站上线后补录 `api.docUrl`；注册表条目随 uikit 迭代同步维护。
- **关联 skill**：`uikit-component-authoring` / `websdk2-uikit-migration`

### [x] D88. 群已读详情未按 userId 去重，多端登录记作不同人已读

- **现象**：`getGroupMessageReadUsers` 返回的已读用户列表直接展示，未按 userId 去重。同一账号多端登录时每个设备各上报一条已读记录，弹窗已读列表重复展示同一用户，已读 Tab 计数把设备数当人数（记作不同人已读）。
- **证据**：`modules/chat/message-list/message-list.vue` 的 `onGroupReadClick`（`modalReadList.value = readUsers` 直接赋值）；SDK 类型 `GroupMessageReadUsersResult.users: ReadonlyArray<GroupMessageReadUser>`。
- **建议修法**：展示前按 `userId` 去重；成员差集侧同步防御去重。
- **修复**：已于 2026-08-06 修复。`message-list.vue` 的 `onGroupReadClick` 已读列表改为 `[...new Set(...)]` 按 userId 去重后赋值；未读列表的群成员 userId 同样去重后再做差集，避免异常数据重复展示。气泡上的 `groupReadCount` 为服务端统计 count（无用户列表），UIKit 侧无法去重，服务端需保证按人统计。
- **关联 skill**：`websdk2-uikit-migration` / `uikit-component-authoring`

### [x] D89. 多处 `@media (hover: hover)` 块内选择器无缩进，触发 lint 报错与构建 CSS 警告
- **现象**：`message-bubble-wrapper.vue`、`shared-file-list-item.vue`、`conversation-item.vue` 等多个文件存在 `@media (hover: hover) {` 块内选择器未缩进（与包裹语句同层级），lint 报 `Insert ··`，构建时 esbuild 报 `Unexpected "@media"` CSS 警告（不影响产物）。疑似历史 `wrap-hover` 脚本批量包裹 hover 样式时未补缩进。
- **建议修法**：对 `@media (hover: hover)` 块内选择器统一补缩进；或按文件逐个修复后跑 `pnpm exec eslint --fix <file>` 校验。
- **修复**：已于 2026-08-15 修复。三部分：
  1. **0 缩进选择器补缩进**：脚本检测全量 `@media (hover: hover) {` 块内 0 缩进选择器，**39 个文件 56 行**补 2 空格（仅动缩进，CSS 语义不变）；另修 `shared-file-list-item.vue` 选择器块内缩进。
  2. **构建警告真根因**（本条原归因于缩进，实际根因在 `copyable-text.vue`）：`@media` 前一行是逗号结尾的选择器列表（`.copyable-text:hover .copyable-text__btn,`），esbuild 解析错位报 `Unexpected "@media"` ——已把两个 hover 选择器合并进 `@media` 块修复，**build CSS 警告消除**（此前 1318/1321 行警告即此）。
  3. **顺带修复**：`input.vue` 的 `@media (hover: none), (max-width: 767px)` 原嵌套在 `.uikit-input__field` 规则块内（CSS nesting 写法，原生 CSS 下浏览器可能丢弃）——平铺到顶层后，D54 的移动端 16px 覆写确认真正生效（dist 中 `@media (hover:none),(max-width:767px){.uikit-input__field{font-size:16px}}` 存在）；并对 39 个文件跑 `eslint --fix` 清理格式错误。
  - **剩余**：这 39 个文件仍有 6 个**既有 JS 逻辑错误**（`chat.vue` 2 处 / `rich-input.vue` 2 处 / `simple-input.vue` 1 处 `no-use-before-define`、unused var），与 CSS 缩进无关、不可自动修，另立条目跟进。
- **关联 skill**：`uikit-lint-governance` / `uikit-styling-theming`

### [x] D90. 面性图标集接入：主题级 iconStyle 切换 + 组件选中态配对

- **背景**：设计师交付面性（filled）图标集 88 个（`面性/icon/filled/`），与线性集命名 1:1 对应；缺失的 32 个为箭头/对勾等纯线条图形（无面性隐喻，属正常）。面性在小尺寸状态图标与选中态辨识度更优（典型如 `pin`）。
- **结论**：技术可行性高（`icon-map`/`EmIcon` 已有填充/描边双渲染分支，加第二注册表 + 缺失回落即可）。推荐「主题级 `iconStyle` 开关（品牌定制）+ 组件选中态自动配对（默认体验）」组合，不做面向终端用户的全局面性开关。**详细盘点、方案权衡与落地步骤见根 [ICON-STYLE-SYSTEM-RESEARCH.md](ICON-STYLE-SYSTEM-RESEARCH.md)（2026-08-06 预研）**。
- **资产合并策略（2026-08-07 沉淀，原根 `ICON-ASSET-MERGE-STRATEGY.md` 已删除归档至本条目）**：`packages/uikit-im/src/assets/icons` 是运行时唯一权威图标库（`EmIcon`/`icon-map.ts` 只认这里）；候选素材库 `assets/icons-next` 已整目录删除（2026-08-07）；设计源目录（`线性/icon/stroked`、`面性/icon/filled`、`消息状态以及未读状态`）为设计师本地工作产物、gitignore 已排除，后续新素材统一放仓库外（设计稿/蓝湖/Figma），由负责工程师评估后复制/替换进 `assets/icons` 并在 `icon-map.ts` 注册；合并采用批次化 + 分类映射表 + 同名脚本对比，不整体覆盖，避免未经验证的视觉回归。
- **关联 skill**：`uikit-styling-theming` / `uikit-component-authoring`
- **核销（2026-08-15，转 roadmap）**：方案与落地步骤已定（见 [ICON-STYLE-SYSTEM-RESEARCH.md](ICON-STYLE-SYSTEM-RESEARCH.md)：第二注册表 `assets/icons-filled/` + `getIconSvg(name, style?)` 回落线性版 + 主题级 `iconStyle` 开关 + 选中态配对）；**88 个面性 SVG 资产尚未提交进包**（设计师源目录 gitignore，规范化产物待工程师按资产合并策略评估后落地）——资产就绪后按预研步骤实施，非当前债务。

### [x] D91. 数字胶囊（Digital Capsule）消息状态与未读数设计落地

- **背景**：设计师交付「数字胶囊」规范（`消息状态以及未读状态/`），含消息状态（空心圆=未读 / 空心圆+对勾=已读）与未读数徽章（按 units/tens/hundreds 位数调整胶囊宽度）两套视觉；同时提供 filled/stroked 两种风格与 normal/small 两种尺寸。
- **现状**：`Badge` 组件尚未按位数规范宽度，无 `filled/stroked` 与 `small` 变体；消息状态仍使用通用 `check`/`doneAll` 图标，缺少 `status/circle`、`status/circle_check`、`status/dot`、`status/dot_check` 专用资源；`iconStyle` 主题切换（D90）尚未实施，无法一键联动。
- **修复（2026-08-06）**：
  1. 重构 `Badge`：按位数设定胶囊宽高（normal：24×24 / 32×24 / 42×24），增加 `size`/`variant` prop，默认继续使用 filled。
  2. 新增消息状态图标：`status/circle`、`status/circle_check`、`status/dot`、`status/dot_check`；`message-bubble-wrapper.vue` 提供可选的 `messageStatus.style: 'capsule'` 映射（未读=圆、已读=圆+对勾），默认保持 `classic` 不破坏既有行为。
  3. `badge.story.vue` / `message-list.story.vue` 增加数字胶囊展示变体。
- **修复（2026-08-07）**：修正 `Badge` small 尺寸与字号。原实现 small 高度仅 16px、字号 9px，与数字胶囊规范（18×18 / 24×18 / 32×18）不符，造成会话列表未读数显大、拥挤。已调整为 small 统一 18px 高，一位 18×18、两位 min-width 24px、三位 min-width 32px，字号降至 8px。
- **残留**：D90 `iconStyle` 实施后，需把 `Badge.variant` 与 `capsule` 消息状态默认绑定 `themeStore.iconStyle`，并补齐 `dot`/`dot_check` 在面性风格下的使用。
- **详细预研与落地记录见根 [DIGITAL-CAPSULE-ICON-RESEARCH.md](DIGITAL-CAPSULE-ICON-RESEARCH.md)**。
- **关联 skill**：`uikit-styling-theming` / `uikit-component-authoring`

### [x] D92. 群聊中己方消息偶现出现在左侧（isSelf 误判）

- **现象**：测试同事反馈群聊场景下，自己发送的消息偶尔显示在左侧（接收方气泡样式），刷新后可能又变回右侧；复现路径不稳定。
- **根因**：`isSelf` 仅在 `toUiMessage` 适配阶段通过 `sdkMsg.from === currentUserId` 计算一次。Easemob SDK 文档说明：自己其他设备发给当前设备时，`from` 格式为 `当前用户ID/来源设备ID`（如 `user1/deviceA`），直接字符串相等会把多端同步回来的己方消息误判为对方消息；此外登录时序、缓存/历史消息加载等场景下 `currentUserId` 可能为空，也会导致误判。
- **修复（2026-08-07）**：
  1. `sdk/adapter/message-adapter.ts`：新增 `normalizeUserId()`，剥离 `/deviceId`、`@appKey`、`#appKey` 等后缀；`toUiMessage` 与 `resolvePeerUserId` 改用归一化比较；对空 `currentUserId` 增加 warning。
  2. `modules/chat/message-item/message-bubble-wrapper.vue`：渲染层以 `clientStore.currentUser` 实时重新判定 `isSelf`，fallback 到消息对象存储的 `isSelf`，确保已入库的异常消息也能在渲染时纠正。
  3. `sdk/event/chat-events.ts` / `sdk/notification-engine.ts`：新消息去重、自动清未读、@我判定、通知过滤等依赖 `from === currentUser` 的逻辑统一走 `normalizeUserId`。
- **验证**：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build`。
- **关联 skill**：`uikit-component-authoring` / `websdk2-uikit-migration`

### [x] D93. 会话列表自定义消息（userCard）刷新后空白，群聊摘要发送者名点击后才出现

- **现象**：刷新页面后拉取会话列表，自定义消息（如名片 userCard）的最新一条消息在会话列表空白展示；点击会话加载历史消息后才会显示 `[名片]`。群聊场景下，最新一条消息的发送者名（前缀）也是点击会话后才出现/才变为昵称。
- **根因**：
  1. `sdk/adapter/message-adapter.ts` 的 `extractSnippetText` 仅在 `snippet.type === 'custom'` 时识别 `body.event`；SDK 在部分链路把自定义消息摘要归一为 `unknown` 类型，导致默认分支未命中 preview map，返回空串。
  2. `sdk/adapter/conversation-adapter.ts` 构造群聊摘要时仅使用 SDK `lastMessage.sender.nickname || from`，未利用 UIKit 已缓存的联系人备注 / 用户资料昵称；且未归一化多设备后缀 `userId/deviceId`，导致 resolver 无法命中、前缀显示为原始 `from`。
  3. 资料异步加载场景下，会话列表项不会随资料就绪自动刷新前缀，只有进入聊天页后 `chat.vue` 的 `lastMessageSummary` 才会重写摘要。
- **修复（2026-08-07）**：
  1. `extractSnippetText` 在 `custom` 分支与 `default/unknown` 分支均通过 `extractCustomEvent()` 识别 `body.event` / `body.params.event`，兜底 `[自定义]`，避免空白。
  2. `conversation-adapter.ts` 新增 `ToUiConversationOptions.resolveSenderName`，构造时优先用 UIKit 资料解析发送者名；`from` / `sender.userId` 统一 `normalizeUserId` 去掉多设备后缀；`UiConversation` 新增可选 `lastMessageFrom` 字段。
  3. `ConversationDomain` / `use-uikit.ts` / `chat-events.ts` 传入基于 `contact` / `userInfo` store 的 `resolveSenderName`。
  4. `modules/conversation/conversation-item.vue` 群聊场景下用 `useUserInfo(props.conversation.lastMessageFrom)` 监听资料变化，实时把 `userId: ` 前缀替换为备注/昵称。
- **验证**：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build`。
- **关联 skill**：`uikit-component-authoring` / `websdk2-uikit-migration`

### [x] D95. 流式消息（Stream Message）接入 UIKIT：内核薄 + 插件厚分层落地

- **背景**：环信 IM 支持流式消息（边生成边接收，典型 AI 对话），SDK 通过 `onStreamMessage` 按 `msgServerId` 排序合并分片，仅文本类型、客户端只收不发；消息体带 `stream`（`deltaText`/`fullText`/`status`/`customType`/`errorType`/`finishReason`）。
- **结论**：流式是 TEXT 消息的「接收状态」而非新类型 → 内核只内置「数据链路 + 纯文本流式状态」，markdown 渲染与 AI 集成（重依赖/可选能力）走插件（`#message-txt` / `#message-custom` 插槽 + `useChatPlugin` + `dataSource`）。
- **执行计划**（分层任务 / 里程碑 / 决策点 / 风险 / 验收）：见根 [STREAMING-MESSAGE-PLAN.md](STREAMING-MESSAGE-PLAN.md)。
- **进度（2026-08-14）**：M1（类型层 `STREAM_MESSAGE_STATUS` + `UiMessage.stream`、事件层 `onStreamMessage` 按 `msgServerId` 幂等合并 `fullText`、`onMessage` 丢片补偿）、M2（`text-message.vue` 纯文本流式光标 / 终态收敛 / 异常提示、message-list 流式滚动跟随）、M3（demo markdown 流式气泡 `#message-txt` 插件接管 + 打字机）已完成；M4 demo mock AI 会话已落地（toolbar 入口 + 设置面板 + 分片模拟器），真实模型对接（DeepSeek 直连 / 业务代理）待执行；M5（抽包 + 文档）待执行。文档新增 `guide/ai-stream-message.md` 独立章节。
- **关联 skill**：`uikit-message-rendering` / `uikit-chat-plugin-tabs` / `websdk2-uikit-migration` / `uikit-component-authoring`
- **核销（2026-08-15，转 roadmap）**：M1（内核数据链路）/ M2（纯文本流式渲染）/ M3（demo markdown 插件）+ M4 demo mock AI 会话均已落地验证，内核「薄 + 插件厚」能力完整；剩余 M4 真实模型对接（DeepSeek 直连/业务代理，需外部接入方式）与 M5 抽独立包（`@easemob/uikit-ai`）属发布后增强，按 [STREAMING-MESSAGE-PLAN.md](STREAMING-MESSAGE-PLAN.md) 推进，非当前债务。

### [x] D96. D89 清理后遗留的 6 处既有 JS lint 错误（no-use-before-define / unused var）

- **现象**：2026-08-15 D89 修复后对这 39 个文件跑 eslint，仍剩 6 处**不可自动修复**的 JS 逻辑错误（非 CSS 缩进问题，均为既有代码）：
  - `modules/chat/chat.vue:178`（`'t' was used before it was defined`）、`:424`（`'isGroupChat' was used before it was defined`）；
  - `modules/chat/message-input/rich-input.vue:268-269`（`inlineImageBlobUrls` used before defined）；
  - `modules/chat/message-input/simple-input.vue:162`（`typingThrottleTimer` 赋值未使用）；
  - `modules/chat/message-item/message-bubble-wrapper.vue:165`（`messageStatus` used before defined）。
- **建议修法**：逐处人工判断——use-before-define 多为模板/计算属性引用顺序问题，需确认无运行时风险后调整声明位置或加类型标注；unused var 直接删除或补 `_` 前缀。修完跑 `pnpm exec eslint <file>` 确认清零。
- **修复**：已于 2026-08-15 修复（均为无运行时风险的声明位置调整/清理）：
  - `chat.vue`：`const { t } = useLocale()` 前移至 `lastMessageSummary` 之前；`conversationType` / `isGroupChat` 两个 computed 前移至 `isPeerTyping` 之前（依赖 `currentConversation` 均更早定义，computed 惰性求值无行为变化）。
  - `rich-input.vue`：`inlineImageBlobUrls` Set 定义前移至 `handleSend` 之前。
  - `simple-input.vue`：删除值从未被读取的 `typingThrottleTimer` 变量（保留 `isTypingThrottled` 节流语义，setTimeout 匿名化）。
  - `message-bubble-wrapper.vue`：`messageStatus` computed 前移至 `isGroupReadReceiptActive` 之前。
  - 验证：6 处 lint 错误清零（`pnpm exec eslint <file>`）。
- **关联 skill**：`uikit-lint-governance`

### [ ] D97. 聊天室 UIKit（`@easemob/uikit-chatroom`）：独立场景包 + 抽 `@easemob/uikit-core` 设计规划

- **背景**：聊天室（直播/语聊房/小班课/私域直播，H5 居多）与单群聊场景几乎不重合（无离线/未读/回执/会话列表，消息为广播流），需独立场景包；但主题/i18n/sdk 抽象/原子组件必须单一维护，故抽共享基座。底层 `easemob-websdk@5.0.0` 已具备完整 `ChatRoomManager`（join/leave/成员/管理员/禁言/黑/白名单/公告/房间属性 KV），能力底座齐备。
- **结论**：三包架构 `@easemob/uikit-core`（共享内核）+ `@easemob/uikit-im`（1v1/群聊场景，对外 API 零变化）+ `@easemob/uikit-chatroom`（聊天室场景）；变种靠「场景预设 config + 容器插槽」，不 fork、不拆子场景包；H5-first。
- **关键增量/修正（评审已核实）**：① 事件注册按场景分离（core 只留连接级 + notice，chatroom 自建 `registerChatroomEventHandlers`）；② `ManagerHost` 需新增 `chatRoomManager`（当前 `SdkChatClient.init` 未注册 ChatRoomManager）；③ 所有包 external `vue/pinia/easemob-websdk`，场景包再 external core（单 websdk 实例规则）；④ chatroom 合并 i18n keys 用既有 `mergeLocaleMessages`（P1 核实 core locale 已有合并 API，无需新增 extendLocale）；⑤ `useChatroomAttributes` 四层同步（本地缓存 + set + 变更事件 + 拉取兜底），属性 key 加场景前缀；⑥ `scripts/check-version-sync.mjs` 升级为双版本校验。
- **执行计划**（P0 决策 → P0.5 改名 → P1 抽核 → P2 包骨架 → P3 场景预设 → P4 H5 变种 demo → P5 文档/集成，每阶段门禁全绿）：见根 [CHATROOM-UIKIT-DESIGN.md](CHATROOM-UIKIT-DESIGN.md)。
- **进度（2026-08-15）**：P0 设计评审完成；P0.5 改名 `@easemob/uikit` → `@easemob/uikit-im` 完成；**P1 抽核完成**（core 含 sdk 基座 + ChatRoomManager 注册、core stores、共享 composables、24 原子组件、core 版 EmUIKitProvider、resolver/auto-imports 参数化，10 门禁全绿，逐层判定与实施注记见 [CORE-MIGRATION-CHECKLIST.md](CORE-MIGRATION-CHECKLIST.md)）；**P1 评审修复（2026-08-15 独立复核后）**：⑥ 双版本校验已落地（`check-version-sync.mjs` 校验 im+core，根 CHANGELOG 增 `## @easemob/uikit-core 1.0.0` 段）；im vite `output.globals` 补 `@easemob/uikit-core → EasemobUIKitCore`（UMD 断链修复）；im 依赖 core 改 `workspace:^`；log-store 下载文件名前缀参数化（`setLogFilePrefix`，im 保持 `easemob-uikit-im` 语义）；core/im 新增文件 lint 清零；demo 的 core theme alias 统一指 src。
- **进度（2026-08-15，P2 完成）**：聊天室场景包 `@easemob/uikit-chatroom` 0.1.0 完整落地——P2-1 无头内核（sdk domain/adapter/event、store、6 composables、locale/theme/resolver/auto-imports、双版本 changelog 工具）+ P2-2 容器与 UI（`EmChatroomContainer` 外壳 + modules/chatroom 六个业务块 + H5 样式 + demo 验证页）；**store 按「房间注册表 Map + activeRoomId」两层建模**（设计文档 §5.9，消息流按 roomId 分桶，P3 多房间/信令房零返工）；**两包同装硬性验收项全部落地**（① core `sdk/client.ts` SDK 单例配置对齐——首次配置为基准、appKey 冲突抛错、managers 追加注册；② uikit-im `chat-events.ts` 忽略 `chatRoom` 消息；③ chatroom `enableUserInfoSync: false` 显式关闭，避免无 GroupManager 时 SDK 能力校验抛错；Provider 组合经 demo 嵌套实证：IM Provider 内嵌 chatroom Provider，`#/chatroom` hash 页验证通过）；门禁全绿（三包 vue-tsc + build + demo typecheck + changelog:check + core 隔离 + lint）。
- **两包同装待办（2026-08-15 架构核查，uikit-im + uikit-chatroom 同时被同一应用使用）**：设计文档 §7 已把「两包同装」列为边界场景（事件按 manager + chatType 过滤互不污染），SDK 底层机制也允许（`ChatClient.init` 单例 + 相同配置复用 + 追加注册 manager），但按当前已落地代码核查出 3 个缺口，**P2 实施时必须作为硬性验收项**：
  1. **SDK 配置一致性（硬约束）**：`ChatClient.init` 为单例，后续调用若 `isSameConfig` 逐字段比较不一致（appKey / `enableSyncData` 数组全等 / serviceConfig / enableUserInfoSync / deleteConversationOnGroupDestroyed / syncConversationListConfig / deviceId 等）**直接抛错** `ChatClient already initialized with different config`。两场景 Provider 各自调一次 init，而 IM 默认注入 `enableSyncData: ['conversation','contact','group']`、chatroom 按设计不做场景化同步——默认值天然不同，**当前无任何合并机制**。需统一有效 ClientConfig（manager 并集去重 + enableSyncData 对齐）。
  2. **IM 侧事件过滤缺失（另一半隔离）**：SDK ChatManager 不按 chatType 分流，聊天室广播消息经 chatManager 事件面到达；uikit-im 的 `chat-events.ts` 当前**无 `chatType` 过滤**（已核实），两包同装时聊天室广播会流入 IM 消息 store（按 conversationId 落库）与 SDK 会话列表。IM 侧 handler 需显式忽略 `chatType === 'chatroom'` 的消息（设计文档只写了 chatroom 侧过滤，IM 侧需配套补上）。
  3. **Provider 组合机制缺失**：每个场景包各自组合 core provider（`useCoreUIKitProvider` + 各自 `resolveClientConfig`/`onClientSetup`/场景 stores），两包同装 = 两个 UIKitClient 包装器 + 两套 core ctx，登录/登出/重连生命周期需协调，theme/locale/notice 重复安装（幂等未验证）。建议 core 提供组合原语（如多场景 options 合并的「组合 Provider」），而非让用户叠两个场景 Provider。
  - **连带注意（chatroom 包单跑即踩）**：SDK 在 `enableUserInfoSync: true` 时强制要求 `group:namecard` 能力（GroupManager），而 core `UIKitClient` 默认 `enableUserInfoSync ?? true`；chatroom 只注入 `[ChatManager, ChatRoomManager, UserInfoManager]`（无 GroupManager），必须显式 `enableUserInfoSync: false`。
- **多房间订阅（UI 房 + 信令房）设计决策（2026-08-15 补充评审，详见 CHATROOM-UIKIT-DESIGN.md §5.9/§6-7/§9/§10）**：私域直播双聊天室/多聊天室（互动房 + 信令房）架构需求——SDK 已支持多房并行（`joinChatRoom({ leaveOtherRooms: false })` 已核实）；UIKit 按「1 个 UI 房 + N 个信令房」建模：`EmChatroomContainer` 主房保持单数 `room-id`，信令房经 `signal-rooms` 数组订阅（**不引入 `isMultiChatroom` 布尔**，数组存在即多房），信令消息透传 `signal-message` 回调（零渲染零假设、默认不拉历史），`useChatroomMessage().sendText(text, { roomId })` 支持按房发送、节流按房间独立；**`chatroom.ts` store 按「注册表 `Map<roomId, RoomState>` + `activeRoomId`」两层建模（P2 即按此写，单房为特例）**；信令房 join 失败降级不拖累 UI 房；跨房消息无全序（业务不得按全序消费）。
- **headless 弹幕模式（无 UI 接入）设计决策（2026-08-15 补充评审，详见 CHATROOM-UIKIT-DESIGN.md §5.10/§6-8/§9）**：弹幕轨道/飘屏/礼物特效是强差异化 UI，业务需「连接 + 房间 + 消息流 + 发送」数据能力、渲染自管——**headless 为一等公民**（非新增模式，composable 层本就与容器解耦，信令房透传即先行实例）。关键契约：① store/composable 层零组件 import，**容器必须只消费公开 composable 契约**（防「第二 API 面」）；② `useChatroomMessage` 提供 `subscribe` 增量有序 + **批量消费 + 可丢弃中间帧策略**（headless 下节流/丢帧由业务决定，**无消费者时 UIKit 不得自行丢消息**，修正 5.3 渲染节流表述为「容器默认内置节流」）；③ 系统通知全部事件化出口（payload 为 domain 类型）；④ 发送限流反馈程序化（无输入框）；⑤ 与多房间订阅正交（容器+信令房 / headless+多房任意组合，同一 store 建模）。P3 交付 headless 契约，P4 demo-chatroom 增纯弹幕 headless 页作验收。
- **进度（2026-08-15，P3 场景预设系统完成）**：`@easemob/uikit-chatroom` P3 全量落地——**场景预设**（`LIVE_ROOM_SCENE`/`VOICE_ROOM_SCENE`/`CLASS_ROOM_SCENE` 三内置 preset 模块加载即注册，`scene='live'` 等直接生效；`themeOverrides` 容器根元素应用 + `i18nOverrides` 经 `mergeLocaleMessages` 并入；`gift-bar`/`mic-queue` 插槽开放）；**礼物**（`CHATROOM_GIFT_EVENT` custom 协议 + `ChatroomGiftBar` + 消息项礼物渲染，未识别 custom 仍兜底）；**麦位**（`ChatroomMicQueue` 8 麦位存 `voice:micQueue` 房间属性 JSON，四层同步实时可见，变种无需自建服务端）；**管理 UI**（公告编辑 Popup + 成员面板黑名单 tab + 全员禁言入口，`features.muteAll` 驱动）；**多房间订阅（§5.9）**（`signal-rooms` 数组即多房、无布尔开关；信令房 `leaveOtherRooms: false` 并行入房、默认不拉历史、消息只透传不出屏（`signal-message` 事件）、失败/被踢/解散降级 `signal-status` 不拖累 UI 房；断线重连按注册表全量重进，信令房按 `autoRejoin` 配置）；**headless 契约（§5.10）**（`useChatroomMessage().subscribe` 增量有序 + flush 批量回调，与渲染桶并行——封顶 trim 不影响订阅者、无消费者不丢消息；容器与纯 JS 消费同内核，demo 页 headless 订阅面板实证）；**模块按场景分目录**（`modules/chatroom/{common,live,voice}`）；**P3 验收达成**（demo 页场景切换按钮验证三变种仅靠 config+插槽；headless 面板验证订阅契约）；门禁全绿；**下一步 P4 变种 Demo**（`apps/demo-chatroom` 四页面 + 纯弹幕 headless 页）。
- **P3 独立复核（2026-08-15 review）**：场景预设/礼物/麦位/管理 UI 合格；多房间与 headless 契约发现 5 处缺陷并已修复——
  - ① **`useChatroomMessage().subscribe` 一次性绑定调用时刻的活动房间**（§5.10 契约缺口）：进房前调用绑定空房永久失效；demo headless 面板在「已登录后进入页面」下 watch 不触发、触发也绑定空房——**P3 验收实证口径失效**。修复：subscribe 改 watch 活动房间自动重绑定（进房/换房/重进跟随），demo 改 setup 即订阅；
  - ② **UI 房换房 `join()` 调 `reset()` 清空整个注册表**：并行信令房被静默清除（消息丢弃、无 status 回调、服务端成员资格残留）。修复：换房只移除旧 UI 房（removeRoom + clearBucket），信令房保留；
  - ③ **UI 房 join 默认 `leaveOtherRooms: true`**：与 §5.9「并行 join 显式 false」矛盾，换房/重进会连带踢掉已并行加入的信令房。修复：UI 房 join 显式 `false` + 换房时显式 leave 旧 UI 房（best-effort）；
  - ④ **信令房 `pullHistory: true` 为死功能**：经 `loadHistory` 拉取被「活动房间守卫」丢弃（信令房永不等于活动房），且入桶无人消费。修复：joinSignalRoom 拉取后按序经 `dispatchSignalMessage` 透传（`signal-message` 契约复用）；
  - ⑤ **joinSignalRoom 超时失效误用活动房 joinToken**（与信令房令牌恒不等，失效逻辑空转）：store 增 `roomJoinToken(id)` 按房间校验；另 `setJoining`/`setSignalJoining` 显式声明 kind（防信令房被复用为 UI 房的歧义）；`loadBlocklist` 页码误用成员列表长度改按黑名单自身计数；重连信令房重进保留原 `autoRejoin` 配置；`onMessageRecalled` 信令房分支注释修正（撤回仅 messageId 无法构造透传 payload，忽略）。
  - **遗留观察（未修）**：a. 信令房消息/状态订阅器为模块级 Set——多容器并存时各容器收到全部信令房事件（payload 含 roomId 可过滤）；b. mic-queue 并发上麦为 last-write-wins（无锁，符合「无需自建服务端」简化定位，文档已声明）；c. demo 未演示 `signal-rooms`（需真实第二聊天室，P4 补）；d. `i18nOverrides` 为增量叠加不可撤销（切回 custom 场景残留 preset 文案覆盖，已注释声明设计取舍）。
- **P2 独立复核（2026-08-15 三路并行 review：内核层 / UI 层 / 跨包架构）**：内核 8.6/10、UI 合格、跨包中上；发现并修复——
  - **跨包**：① IM 会话列表面 chatRoom 隔离补全（`onConversationListUpdate`/`onSyncDataFinished` 过滤，此前聊天室会话会以单聊身份泄漏进 IM 会话列表）；② IM 消息事件面守卫补全（`onStreamMessage`/`onMessageUpdated`/`onPinnedMessageChanged` 早退）；③ `normalizeUserId` 上提 core（`utils/normalize-user-id.ts`，im/chatroom re-export，消除两包重复实现）；④ `_deleteConversationOnGroupDestroyed` 改从对齐后配置取值；⑤ 对齐告警文案补充「推荐先挂载 IM Provider」指引（chatroom 先 init 会把 IM 的 contact/group 同步与 enableUserInfoSync 对齐关闭——**顺序敏感能力降级，P3 文档需明确**）；⑥ core `CONVERSATION_TYPE` 扩 CHATROOM 曾尝试后回退（`ConversationTypeValue` 联合扩大破坏 im 12 处对 `MessageChatConversationType` 的类型收窄，维持 chatroom 包独立常量 + IM 字面量注释对齐）；
  - **内核**：⑦ join 失败语义修正（入房后历史拉取失败只 toast 降级不整体回滚，`join()` resolve = 已入房）；⑧ joinToken 改全局单调计数器（removeRoom 重建不撞号，陈旧 ACK 不被误接受）；⑨ 切房清理旧房消息桶（防桶与定时器泄漏）；⑩ maxMessages 改按房间生效（去掉模块级默认改写，防跨实例污染）；⑪ `useChatroom` 返回 `dispose()`（headless 释放断线重连 watcher）；⑫ `leave()` 在 JOINING 态直接取消不调服务端；⑬ 历史提示条数取实际拉取量；⑭ `loadMembers` 加 in-flight 守卫；⑮ `useChatroomMember` 新增 `isInAllowlist()`（全员禁言白名单豁免，UI 层接线）；⑯ 白名单/被踢事件日志降 debug（防刷屏）；
  - **UI**：⑰ 容器 kicked 事件透传真实 SDK 原因码（store 记录 kickReason）；⑱ 向上加载历史滚动位置补偿 + 换房重置滚底跟随；⑲ `features.messageFilter` 接线（渲染前过滤）；⑳ 发送失败回填输入框文本（输入条 expose setText）；㉑ 输入条禁用原因提示（全员禁言/被禁言小字）；㉒ 模块组件改消费公开 composable（message-item/member-item/member-panel 移除直取 store）；㉓ 模板消息类型字面量改 script 常量；㉔ 成员面板打开时并行刷新禁言名单、manageable 与 targetManageable 口径对齐（防空菜单）、selfId 统一 normalizeUserId；㉕ 成员面板安全区改 `--uikit-safe-bottom`；㉖ emoji 插入仅已有焦点时恢复光标（防 H5 键盘遮挡）；㉗ 容器卸载自动 leave（demo 页移除直调 store reset，改 @back 接线）。
  - **遗留记录（未修，P3 前评估）**：a. im `sdk/` 既有 lint 债（`conversation-adapter`/`contact-domain`/`conversation-domain`/`group-domain`/`message-domain` 的 core import 重复与顺序，P1 迁移遗留，非 P2 引入，按「不顺手改未动文件」原则记录）；b. `alignClientConfig` 用 JSON.stringify 比较原始配置（SDK 归一化后字段差异产生告警噪声、函数字段静默，行为安全）；c. 消息流「无消费者不丢消息」模式（headless 订阅层 P3 落地）；d. demo 仅覆盖「IM 前置登录 + chatroom 嵌套」形态，纯 chatroom 单包页待 P4。
- **关联 skill**：`websdk2-uikit-migration` / `uikit-component-authoring` / `uikit-provider-config` / `uikit-h5-adaptation` / `uikit-release-build`

### [x] D99. 三包归属治理：新功能「放 core 还是场景包」无路由约束与硬门禁

- **背景**：P1 抽核后形成 `@easemob/uikit-core` + 场景包（`uikit-im` / 未来 `uikit-chatroom`）三包架构，但「新功能进 core 还是场景包」的约束仅散落在设计文档（静态）与一次性迁移清单（使命已完成），20 个既有 skill 全是「怎么写」没有「放哪」；「core 禁 import 场景包」零门禁。
- **落地（2026-08-15）**：
  1. 新增 skill `.agent/skills/uikit-package-boundary/SKILL.md`：四步判定决策树（功能类型 → 依赖面 → 复用性 → 解耦判断）、默认留场景包倾向、locale（场景文案经 `mergeLocaleMessages` 合入，不写 core locale 文件）与 constants 特例、进 core 自检清单、硬规则/软约定、反面清单；
  2. AGENTS.md 路由表登记（首位，触发词：`新功能放哪` / `进 core` / `core 还是 im` / `包边界` 等）；
  3. 硬门禁 `packages/uikit-core/scripts/check-core-isolation.mjs` 挂 core build 前置：扫描 core src/scripts 的 import（含动态 import 与相对越界），违规即非零退出（已双向验证：正常通过 / 注入违规文件报错）；
  4. `CHATROOM-UIKIT-DESIGN.md` 第四节补引用（边界判定执行层以该 skill 为准）。
- **验证**：门禁脚本 pass/fail 双向通过；core build 前置挂载后重跑构建正常。
- **关联 skill**：`uikit-package-boundary` / `uikit-skill-authoring` / `uikit-lint-governance`

### [ ] D100. core 引擎层（sdk/constants/utils）保持纯 TS：门禁落地 + domain 类型接口化待办

- **背景**：评估 core 对未来跨端 uikit（uniapp / 微信小程序等）的可复用性后确认：组件层必然重写（渲染链不兼容）、composable 大半重写（DOM 类失效），可复用的是纯 TS 引擎层（sdk 基座 / domain / constants / utils / locale 纯逻辑）。但当时引擎层存在一条间接 vue 运行时依赖：`sdk/event/notice-utils.ts` 值 import `locale/index.ts`（后者 import vue），ESM 模块级依赖使「引擎层零 vue」承诺失效。
- **落地（2026-08-15）**：
  1. locale 拆层：`locale/messages.ts`（纯 TS：文案存储/`t`/`setLocale`/`mergeLocaleMessages`/`findLocaleKey`，零 vue）+ `locale/use-locale.ts`（Vue 响应式适配 `useLocale`，内部 ref + 订阅同步 + `onScopeDispose` 清理，行为与原实现一致）+ `locale/index.ts` 公共 API 面不变（`useLocale` / `t` / `createLocale` / `mergeLocaleMessages` / `findLocaleKey` / type / zh-CN / en）；
  2. `notice-utils.ts` 改从 `../../locale/messages` 引入 `t`（引擎层零 vue 达成）；
  3. 新增门禁 `packages/uikit-core/scripts/check-engine-isolation.mjs` 挂 core build 前置：扫描 `src/sdk` / `src/constants` / `src/utils`，禁值 import `vue`/`pinia`/`@vueuse/*` 及相对路径进入 Vue 层模块（store/composables/components/containers/locale 除 messages 外）；`import type` 放行（运行时擦除）；DOM API（download/log-store）属平台适配点不拦。
- **已知漂移（放行项，后续可接口化）**：`sdk/domain/user-info-domain.ts` / `presence-domain.ts` 对 Vue 层 store/composables 的类型级引用（`import type { UserInfoStore }` / `UIKitDataSource`）运行时零依赖，但 .d.ts 会带 vue/pinia 类型——若未来跨端直接依赖 core 类型，需改为纯 TS 接口（`UserInfoStoreLike` / `DataSourceLike`）。
- **验证**：门禁 pass/fail 双向通过（注入 `src/sdk/__probe_vue__.ts` 拦截、清理后恢复）；core build（门禁 + vite + vue-tsc）全绿；im / demo `vue-tsc --noEmit` 通过（`useLocale` 返回 `locale` 由 `ComputedRef` 变 `Ref`，无消费方显式标注类型，兼容）。
- **关联 skill**：`uikit-package-boundary` / `uikit-release-build`

### [ ] D98（已归档，见「已修复」区）

---

## 已修复（归档）

- [x] **D98. `use-user-info` / `use-own-user-info` 依赖场景 contact store，进 core 前需解耦**
  - 已于 2026-08-15 按方向①修复（P1 收尾清理项）。
  - 改动：core 新增 `composables/use-user-info.ts` / `use-own-user-info.ts`（注入 `useCoreUIKit()`，优先级「资料昵称/头像 > 用户 ID」，无 contact 耦合），core 桶显式导出、aux 白名单重生成（19 个 hook）；uikit-im 两文件改为薄包装——组合 core 版 + 叠加 `stores.contact` 备注/头像兜底，对外签名与优先级「备注 > 资料昵称 > 用户 ID」不变。
  - 验证：core/uikit-im vue-tsc + build、demo typecheck、changelog:check 全绿。

- [x] **D1. 移除未使用的 UnoCSS（含 demo 侧）**
  - 已于 <待填 commit> 修复。
  - 改动：删除 `packages/uikit-im/uno.config.ts`、`apps/demo/uno.config.ts`；从 `packages/uikit-im/package.json`、`apps/demo/package.json` 移除 `unocss` 及 `@unocss/*` 依赖；从 `packages/uikit-im/histoire.config.ts`、`apps/demo/vite.config.ts`、`packages/uikit-im/src/histoire-setup.ts` 移除 UnoCSS 插件/import。
  - 验证：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 均通过；产物 `dist/easemob-uikit-im.js` 不再包含 UnoCSS。

- [x] **D2. 修正库构建 external，把 `im-sdk-web` 改为 `easemob-websdk`**
  - 已于此前提交修复。
  - 改动：`packages/uikit-im/vite.config.ts` 的 `rollupOptions.external` 与 `output.globals` 中 `im-sdk-web` → `easemob-websdk`。
  - 验证：构建产物 `dist/easemob-uikit-im.js` 以 `import { ChatClient as H2, ... } from "easemob-websdk"` 引入 SDK；UMD 产物以 `require("easemob-websdk")` 引入；SDK 不再内联到 UIKit 包中。

- [x] **D8. 统一长按实现并修复 H5 长按与滚动冲突**
  - 已于 2026-07 H5 适配专项修复。
  - 改动：`composables/use-long-press.ts` 改用 vueuse `onLongPress`，增加 touchmove 阈值与长按时 `document.body.style.overflow='hidden'` 滚动抑制；`modules/conversation/conversation-item.vue`、`modules/chat/message-item/message-interactive.vue` 统一改用 `useLongPress`。
  - 验证：类型检查 + 构建 + demo 类型检查通过。

- [x] **H5 适配核心能力落地（2026-07 专项）**
  - 已于 `04e07ca` 修复。
  - 改动：
    - 新增 `packages/uikit-im/src/composables/use-h5-adaptation.ts`，集中管理 viewport/安全区/键盘高度/下拉刷新/字号缩放预留；
    - `theme/index.css` 新增 `--uikit-safe-*` 与 `--uikit-font-scale`；
    - `use-uikit.ts` 的 `UIKitContext` 注入 `h5` 单一实例；`use-viewport.ts` 优先从 context 读取；
    - `uikit-provider.vue` 新增 `h5?: H5AdaptationConfig` prop，`safeArea=false` 时覆写 CSS 变量为 `0px`；
    - 安全区接入：`chat-container`、`chat` header、`address-book-container` header/footer、`popup` bottom、`scroll-to-top`、`message-input` emoji sheet、`conversation-list` header/footer；
    - 键盘适配：`chat.vue` 读取 `h5.keyboardHeight` 传给 `MessageInput`，输入框 focus 触发 `message-list.scrollToBottom()`；
    - 动画修复：`message-input` emoji sheet 改用 `uikit-slide-up` Vue Transition，多处硬编码 `0.15s/0.2s` transition 改接 `--uikit-anim-*`；
    - 导出更新：`composables/index.ts`、`auto-imports.ts` 加入 `useH5Adaptation`。
  - 验证：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 均通过。

- [x] **H5 专用微信式输入区组件（h5-input）落地 + 键盘适配三件套**
  - 已于 2026-07-28 修复。
  - 改动：
    - 新建 `modules/chat/h5-input/h5-input.vue`：auto-grow textarea（font-size 16px，规避 iOS focus 自动缩放）、按住说话上滑取消、表情/更多面板与键盘三者互斥、面板高度对齐键盘高度；
    - `modules/chat/message-input/index.vue` 移动端接线 H5Input，卡片样式从输入组件剥离；
    - `composables/use-keyboard.ts`：键盘高度公式补 `visualViewport.offsetTop`、无 `visualViewport` 时降级 `window.innerHeight` resize 差值、补 focusout 处理（对应 D48）；
    - `containers/chat-container/chat-container.vue` 键盘弹起态去掉 safe-bottom 叠加（对应 D49）；
    - `modules/chat/chat.vue` watch `keyboardHeight` 变化后二次 `scrollToBottom()`（对应 D50）。

- [x] **D94. Domain/Store 层缺少网络请求去重与结果缓存，导致切换会话时重复拉取群详情/公告/管理员**
  - 已于 2026-08-07 修复。
  - 现象：
    - `MessageDomain.markMessagesRead` 未分批，离线消息超过 50 条时触发 SDK `ValidationError`；
    - `sdk/event/chat-events.ts` 的 `patchConversationNames` 无请求缓存，SDK 定时同步会话列表时反复批量拉取群详情；空群名 fallback 到 groupId 导致无限补全循环；
    - `message-interactive.vue` 每个消息气泡独立维护 `triedFetchRole`，进入群聊时 N 个气泡并发请求同一群详情；
    - `GroupDomain.fetchGroupInfo` / `syncGroupAdmins` / `fetchGroupAnnouncement` 只有业务层去重，缺少 Promise 级去重与结果缓存；
    - `store/group.ts` 的 `getGroupAnnouncement` 用 `|| ''` 兜底，无法区分"未获取"与"已获取但为空"，空公告每次切换会话都重复请求；
    - `syncGroupAdmins` 每次 `fetchGroupMembers` 首屏都重新请求管理员列表。
  - 改动：
    - `MessageDomain.markMessagesRead` 按 SDK 限制 50 条分批发送已读回执；
    - `chat-events.ts` 增加 `fetchedGroupNameIds` 缓存与 `resetChatEventState()`，空群名不再写入 conversation.name；
    - `GroupDomain` 增加 `pendingGroupInfoRequests` / `pendingGroupAdminRequests` / `pendingGroupAnnouncementRequests` 三套 Promise 去重；
    - `store/group.ts` 增加 `groupAdminSyncedIds` 标记，已同步管理员的群不再重复拉取；`getGroupAnnouncement` 返回 `string | undefined`；
    - `modules/chat/chat.vue` 预拉公告条件改为 `announcement === undefined`。
  - 验证：`pnpm -F @easemob/uikit-im exec vue-tsc --noEmit` + `pnpm -F @easemob/uikit-im build` + `cd apps/demo && pnpm exec vue-tsc --noEmit` 均通过。
  - 关联 skill：`uikit-store-composable` / `uikit-component-authoring` / `websdk2-uikit-migration`。
