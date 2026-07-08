# 技术债 / 待修清单（easemob-uikit-vue）

> 来源：2026-07 两次全量源码 review——第一次围绕「依赖库使用 + 编码规范」，第二次围绕「功能完整性 + 正确性 + 影响面」。
> 用法：逐条修复，改完把 `[ ]` 勾成 `[x]` 并在条目后补一句「已于 <commit> 修复」。
> 每条都注明 **现象 / 证据 / 建议修法 / 关联 skill**。证据里的行号可能随改动漂移，以文件+特征定位为准。

规则约束见根 `AGENTS.md` 与 `.agent/skills/*`。修复默认先验证（`vue-tsc --noEmit` + `build`）再提交，commit message 用中文，不主动 push。

---

## P0 · 结构性 / 会误导后人

### [ ] D13. `useLongPress` 组件卸载时未清理定时器和 body 滚动锁

- **现象**：`useLongPress` 创建 `setTimeout` 并设置 `document.body.style.overflow = 'hidden'`，但没有 `onScopeDispose` / `onUnmounted` 清理。组件在长按过程中卸载时 `cleanup()` 不会被调用，导致页面永久无法滚动。
- **证据**：`composables/use-long-press.ts` L28-L113，`cleanup()` 仅在 `end()`/`cancel()`/定时器回调中调用，无生命周期清理。该问题由 D8 修复引入（D8 增加了 `setBodyScroll(false)` 但未配套清理）。
- **建议修法**：在 return 前添加 `onScopeDispose(() => cleanup())`。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-store-composable`

### [ ] D14. `GroupMemberList` 未清理 IntersectionObserver 和定时器

- **现象**：组件创建了 `IntersectionObserver`（`presenceObserver`）和 `setTimeout`（`presenceFetchTimer`），但无 `onBeforeUnmount` 钩子清理。卸载后 observer 继续观察已移除 DOM，定时器在已销毁组件上下文中执行 `fetchPresence`，造成内存泄漏和潜在报错。
- **证据**：`modules/group/group-member-list.vue` L92-L93 创建，全文件无 `onBeforeUnmount`。
- **建议修法**：添加 `onBeforeUnmount(() => { presenceObserver?.disconnect(); presenceObserver = null; if (presenceFetchTimer) { clearTimeout(presenceFetchTimer); presenceFetchTimer = null } })`。
- **关联 skill**：`uikit-component-authoring`

### [ ] D15. 多选状态在会话切换时泄漏

- **现象**：`isMultiSelectMode` 和 `selectedMessageIds` 是模块级 `ref` 单例。`exitMultiSelectMode()` 仅在 `onUnmounted` 调用，不在 `watch(currentConversation)` 会话切换时调用。用户在会话 A 进入多选后切换到会话 B，多选栏仍可见且状态为空。
- **证据**：`composables/use-message-actions.ts` L8-L10 模块级单例；`modules/chat/chat.vue` L398-L440 `watch(currentConversation)` 未调用 `exitMultiSelectMode()`。
- **建议修法**：在 `chat.vue` 的 `watch(currentConversation, ...)` 回调开头调用 `exitMultiSelectMode()`。
- **关联 skill**：`uikit-store-composable`

### [ ] D16. UserInfoDomain 事件监听在 Provider 卸载时未清理

- **现象**：`onScopeDispose` 仅调用 `disposeEvents?.()`，未调用 `disposeUserInfoDomain?.()`。Provider 组件卸载但不 logout 时（路由切换/条件渲染），`UserInfoDomain.listen()` 注册的 SDK 事件处理器泄漏，重新挂载时注册重复处理器导致事件双次处理。
- **证据**：`composables/use-uikit.ts` L227-L229，仅 `disposeEvents?.()`；`setupClient` 中 `domains.userInfo.listen()` 注册了 `addEventHandler`。
- **建议修法**：`onScopeDispose(() => { disposeEvents?.(); disposeUserInfoDomain?.(); disposeUserInfoDomain = null })`。
- **关联 skill**：`uikit-store-composable`

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

### [ ] D17. `updateUploadProgress` 未实际更新上传进度值

- **现象**：`updateUploadProgress` 接收了 `_percent` 参数（前缀 `_` 表示未使用），只做了 `{ ...msg }` 展开，没有将 `percent` 赋值到消息的 `progress` 字段。上传进度永远不会反映到 UI。
- **证据**：`store/message.ts` L156-L158，`_updateMessageById(localId, msg => ({ ...msg }))` 未写入 `progress`。
- **建议修法**：`function updateUploadProgress(localId: string, percent: number) { _updateMessageById(localId, msg => ({ ...msg, progress: percent })) }`。
- **关联 skill**：`uikit-store-composable`

### [ ] D18. `onMembersExited` 事件缺少 `members` 空值检查

- **现象**：`onMembersExited` 直接访问 `(p.members as unknown[]).length`，而同文件的 `onMembersJoined` 使用了 `payload.members || []` 安全降级。SDK payload 的 `members` 为 `undefined` 时会抛 `TypeError`。
- **证据**：`sdk/event/group-events.ts` L56-L59，对比 L43 `const members = payload.members || []`。
- **建议修法**：`const members = (p.members as unknown[]) || []; stores.group.decrementMemberCount(p.groupId, members.length)`。
- **关联 skill**：`websdk2-uikit-migration`

### [ ] D19. `resendMessage` 对媒体消息先删除后不重发，导致消息丢失

- **现象**：`resendMessage` 先执行 `deleteMessage` 删除旧消息，然后对 `image`/`voice`/`video`/`file` 类型仅打印 `console.warn` 并 `return`。失败的媒体消息被永久删除且无法恢复。
- **证据**：`composables/use-message-send.ts` L131 先 `deleteMessage`，L144-L149 媒体类型仅 warn+return。
- **建议修法**：将 `deleteMessage` 移到确认可重发之后；对媒体类型提前 return 不删除：`if (['image','voice','video','file'].includes(message.type)) { console.warn(...); return }` 然后再 `deleteMessage` + 重发文本/自定义消息。
- **关联 skill**：`uikit-store-composable`

### [ ] D20. `uploadGroupSharedFile` 存在回调与 Promise 竞态条件

- **现象**：通过 `onFileUploadComplete` 回调赋值 `response` 变量，然后 `await` 上传 Promise。如果 Promise 在回调触发之前 resolve，`response` 仍为 `undefined`。
- **证据**：`sdk/domain/group-domain.ts` L275-L284，`let response: unknown` + `await ...uploadSharedFile({...})` + `return response`。
- **建议修法**：用 Promise 包装回调：`return new Promise((resolve, reject) => { ...uploadSharedFile({ file, onFileUploadComplete: resolve, onFileUploadError: reject }) })`。
- **关联 skill**：`websdk2-uikit-migration`

### [ ] D21. ThemeStore 和 `useH5Adaptation` 直接访问 `document`/`window` 无 SSR 保护

- **现象**：Store setup 中直接调用 `document.documentElement.style.setProperty(...)`；`useH5Adaptation` 的 `updateViewportAndSafeArea()` 直接访问 `window.innerWidth` 等。SSR 环境下会 `ReferenceError` 崩溃。且 ThemeStore L111-122 的初始化与下方 `watchEffect` 重复。
- **证据**：`store/theme.ts` L111-L122 无 `typeof document` 守卫；`composables/use-h5-adaptation.ts` L57-L79 `updateViewportAndSafeArea()` 内无 `typeof window` 守卫（ref 初始值 L46-47 有守卫但函数内没有）。
- **建议修法**：ThemeStore 移除 L111-122 直接调用（`watchEffect` 已覆盖）或加 `if (typeof document === 'undefined') return`；`useH5Adaptation` 函数开头加 `if (typeof window === 'undefined') return`。
- **关联 skill**：`uikit-styling-theming` / `uikit-h5-adaptation`

### [ ] D22. 自动重连后未恢复 `currentUser`，`isLoggedIn` 永远为 false

- **现象**：`onDisconnected` 清空 `currentUser`，`onConnected`（自动重连）设置 `connected = true` 但不恢复 `currentUser`。重连后 `isLoggedIn = connected && !!currentUser` 仍为 `false`，`watch(isLoggedIn)` 不触发，黑名单/联系人不重新拉取。`chat-events.ts` 的 `onMessage` 用 `currentUser` 判断 `isSelf`，重连后全部失效。
- **证据**：`sdk/event/connection-events.ts` L17-L21 `onDisconnected` 清空 `currentUser`；L13-L16 `onConnected` 不恢复。
- **建议修法**：不在 `onDisconnected` 时清空 `currentUser`（仅 `logout()` 时清空），或在 `onConnected` 中从 SDK 恢复：`const uid = (stores.client as any).client?.getCurrentUserId?.(); if (uid) stores.client.setCurrentUser(uid)`。
- **关联 skill**：`websdk2-uikit-migration`

### [ ] D23. Group store 直接对象修改绕过 `computed` 响应式

- **现象**：`updateGroup`、`updateGroupJoinRequest`、`updateGroupMemberRole` 通过 `Object.assign(g, patch)` / `item.status = status` / `member.role = role` 原地修改对象，不替换数组引用。`computed(() => groupMembersMap.value)` 依赖 ref 值身份，内部属性变更不触发 computed 重算。组件通过 computed 读取时不收到更新。
- **证据**：`store/group.ts` L89-L93 `Object.assign(g, patch)`；L229-L235 `item.status = status`；L274-L279 `member.role = role`。
- **建议修法**：用新数组引用替换：`groupMembersMap.value = { ...groupMembersMap.value, [groupId]: list.map(m => m.userId === userId ? { ...m, role } : m) }`。对 `updateGroup` 和 `updateGroupJoinRequest` 同理。
- **关联 skill**：`uikit-store-composable`

### [ ] D24. `useChat().setTyping()` / `sendTypingCmd()` 为空实现 — 打字指示器功能无效

- **现象**：`setTyping()` 和 `sendTypingCmd()` 均为空占位函数。UI 已完整接线（`TypingIndicator` 组件已渲染、`@typing` 事件已绑定、`enableTyping` 默认 `true`），但 `typingMap` 永远为空，`isTyping` 永远为 `false`，打字指示器永远不显示。属于功能死端。
- **证据**：`composables/use-chat.ts` L44-L46 `sendTypingCmd` 空函数 + L146-L148 `setTyping` 空函数；`modules/chat/chat.vue` L313-L357 已接线 `isTyping` computed 和 `setTyping()` 调用。
- **建议修法**：实现 CMD 消息发送 + store 更新，或如本期不实现则移除 UI 绑定以避免混淆。
- **关联 skill**：`uikit-store-composable`

### [ ] D25. 转让群主功能方法已实现但无 UI 入口

- **现象**：`changeGroupOwner` 方法已在 `use-group.ts` 和 `group-domain.ts` 中实现，但没有任何 UI 组件调用。`group-member-list.vue` 的 `getMoreActions()` 不包含转让群主操作项。
- **证据**：`composables/use-group.ts` L119-L122 定义 `changeGroupOwner`；`modules/group/group-member-list.vue` L387-L403 `getMoreActions()` 缺少 `transferOwner` 操作项；`chat.vue` 未导入 `changeGroupOwner`。
- **建议修法**：在 `getMoreActions()` 中为群主添加「转让群主」操作项（仅当前用户是群主且目标成员非自己时显示），并在 `chat.vue` 添加对应处理函数。
- **关联 skill**：`uikit-contact-group-capabilities`

### [ ] D26. 群公告编辑 UI 缺失

- **现象**：`updateGroupAnnouncement` 方法已定义但全代码库中无任何组件调用。群公告仅展示不可编辑，群主/管理员无法通过 UI 编辑。
- **证据**：`composables/use-group.ts` L86-L88 定义 `updateGroupAnnouncement`；`modules/chat/drawer/chat-info-drawer.vue` L400-L410 仅展示群公告内容。
- **建议修法**：在 `chat-info-drawer.vue` 群公告区域为群主/管理员增加编辑按钮和输入框，调用 `updateGroupAnnouncement`。
- **关联 skill**：`uikit-contact-group-capabilities`

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

### [ ] D27. `invite-member-modal.vue` 和会话弹窗组件未从 barrel 文件导出

- **现象**：`invite-member-modal.vue` 已实现且被 `chat.vue` 内部导入使用，但未从 `group/index.ts` 导出。`new-chat-modal.vue`、`add-contact-modal.vue`、`create-group-modal.vue` 同理，仅被 `conversation-list.vue` 内部使用但未从 `conversation/index.ts` 导出。外部消费者无法独立使用这些组件。
- **证据**：`modules/group/index.ts` 无 `EmInviteMemberModal` 导出；`modules/conversation/index.ts` 仅导出 List/Item。
- **建议修法**：在 barrel 文件中补充导出：`group/index.ts` 加 `export { default as EmInviteMemberModal } from './invite-member-modal.vue'`；`conversation/index.ts` 加 `EmNewChatModal`/`EmAddContactModal`/`EmCreateGroupModal`。
- **关联 skill**：`uikit-component-authoring`

### [ ] D28. `useBlocklist` 的 `if (!client.value)` 守卫为死代码且无错误处理

- **现象**：`client` 是 `shallowRef(host)`，`host` 是始终 truthy 的代理对象，`if (!client.value) return` 永远不触发。SDK 未初始化时通过代理访问会抛错而非被守卫拦截，且 `refresh()`/`addBlock()`/`removeBlock()` 没有 try/catch，导致未捕获的 Promise 拒绝。
- **证据**：`composables/use-blocklist.ts` L30-L53，三方法均有 `if (!client.value) return` 但 `client` 始终为代理对象。
- **建议修法**：移除无效守卫并添加 try/catch 错误处理，或改为检查 SDK 是否已初始化的真实标志。
- **关联 skill**：`uikit-store-composable`

### [ ] D29. `logout()` 未清理事件处理器（`disposeEvents`）

- **现象**：`logout()` 清理了 `disposeUserInfoDomain` 并清空了所有 store，但未调用 `disposeEvents?.()`。登出到重新登录之间若有 SDK 事件，会向已清空的 store 写入。
- **证据**：`composables/use-uikit.ts` L197-L210，`logout()` 调用 `disposeUserInfoDomain?.()` 但未调用 `disposeEvents?.()`。
- **建议修法**：在 `logout()` 中添加 `disposeEvents?.()`。
- **关联 skill**：`uikit-store-composable`

### [ ] D30. GroupDomain 残留 debug `console.warn`

- **现象**：`getGroupSharedFileList` 中有一行 `console.warn('[GroupDomain] getGroupSharedFileList result:', result)` 残留，每次调用群共享文件列表都会输出到控制台。
- **证据**：`sdk/domain/group-domain.ts` L270。
- **建议修法**：删除该行。
- **关联 skill**：`uikit-lint-governance`

### [ ] D31. Provider `features` 对象非响应式，运行时切换 prop 无效

- **现象**：`features` 是 setup 时创建的静态对象（`{ ...defaultFeatures, ...options.features }`），运行时切换 `enableContact`/`enablePresence` 等 prop 无效。Demo 设置面板支持运行时切换，但实际不生效。
- **证据**：`containers/uikit-provider/uikit-provider.vue` L107-L131 静态对象；`watch(isLoggedIn)` 从 `ctx.stores.client.isLoggedIn` 读取但 `features` 是静态值。
- **建议修法**：在 watch 中直接读取 `props` 而非静态 `features` 对象，或将 `features` 改为 `computed`。
- **关联 skill**：`uikit-store-composable`

### [ ] D32. `useRipple` 永久修改目标元素样式

- **现象**：`pointerdown` 时设置 `overflow: hidden` 和可能的 `position: relative`，动画结束后不恢复。依赖 `overflow: visible` 的元素（下拉/tooltip/徽章溢出）会被永久裁剪。
- **证据**：`composables/use-ripple.ts` L56-L63 设置样式，L66-L68 `onEnd` 回调仅 `ripple.remove()` 不恢复样式。
- **建议修法**：保存原始 `overflow` 和 `position` 值，在 `animationend` 回调中恢复。
- **关联 skill**：`uikit-styling-theming`

### [ ] D33. `translateTextMessage` 未对 `result.translations` 做空值检查

- **现象**：`const translation = result.translations[0]` 假设 `result.translations` 一定存在且为数组。SDK 返回结构不含 `translations` 字段时会抛 `TypeError`。
- **证据**：`composables/use-message-actions.ts` L104-L108。
- **建议修法**：`const translation = result?.translations?.[0]`。
- **关联 skill**：`uikit-store-composable`

### [ ] D34. `message-list.vue` 存在遗留 TODO 注释

- **现象**：`// TODO: 处理其他操作（转发）` 但转发功能已在 `chat.vue` 中通过 `ForwardModal` 完整实现，该 TODO 可能是遗留。
- **证据**：`modules/chat/message-list/message-list.vue` L392。
- **建议修法**：清理该 TODO 注释。
- **关联 skill**：`uikit-lint-governance`

### [ ] D36. Cell 类组件视觉不一致 + 重复代码（EmCell 已建，存量待收敛）

- **现象**：会话列表项、联系人项、群组项、群管理导航项、操作行等 cell 类组件的 padding/margin/圆角/transition 各写一套，视觉不统一。`contact-item-default.vue` 与 `group-item-default.vue` 代码 ~90% 重复。`group-management-section` 和 `chat-info-drawer` 的操作行未走 `--uikit-item-hover-*` 体系。
- **证据**：
  - `conversation-item.vue`：`padding: 12px var(...)` + `transition: background-color 0.15s`（硬编码）
  - `contact-item-default.vue` / `group-item-default.vue`：几乎相同的 props/CSS/模板，仅数据源不同
  - `group-management-section.vue` L370-L378：`padding: 10px 12px`，未走 `--uikit-item-hover-*`
  - `chat-info-drawer.vue` L775-L788：`action-row` 同样 `padding: 10px 12px`
- **建议修法**：
  1. 已新增 `components/cell/cell.vue`（EmCell）+ `uikit-cell-contract` skill 约束；
  2. 存量收敛分两步：先修 CSS 变量不一致（`group-management-section` / `chat-info-drawer` 改用 `--uikit-item-hover-*` + `var(--uikit-anim-duration)`），再基于 EmCell 重构 `contact-item-default` / `group-item-default`；
  3. `conversation-item` 因复杂度高（右键菜单/长按/草稿）可暂不基于 EmCell，但 CSS 变量/transition 必须对齐。
- **关联 skill**：`uikit-cell-contract` / `uikit-component-authoring` / `uikit-styling-theming`

---

### [ ] D35. H5 集成体验改进（demo 集成时反向发现）

- **现象 1**：`EmConversationContainer` 未暴露「用户点击某会话」事件供 H5 页面栈导航。内部 `conversation-list` emit 了 `@select`，容器层只 emit `conversation-select`，且选中后直接调 `selectConversation()` 设置 currentConversationId。H5 场景只能 watch `stores.conversation.currentConversationId` 间接实现推页面栈，不够直观。
- **现象 2**：`EmContactContainer` 的 `@contact-click` / `@group-click` 事件只告知「谁被点了」，不管导航。H5 业务需自己管页面跳转，缺少标准做法示例。
- **现象 3**：`EmPopup` `position="bottom"` 时无 `max-height` 约束，H5 弹出会占满全屏，需业务侧自行加 `max-height` + 圆角。
- **现象 4**：`h5.fontScale` 目前纯占位，设值后无组件消费 `--uikit-font-scale` 做字号缩放，文档应标注「暂未生效」避免误解。
- **现象 5**：缺乏官方 H5 集成示例 / guide 页面，业务方从零摸索成本高。
- **建议修法**：
  1. `EmConversationContainer` 增加 `@conversation-click` 事件或文档说明 H5 导航标准模式；
  2. `EmPopup` bottom 模式自动限制 `max-height: 85vh` + 顶部圆角；
  3. `h5.fontScale` 文档标注 P2 预留暂未生效；
  4. 补充 H5 集成 guide 或 demo 页面。
- **关联 skill**：`uikit-h5-adaptation` / `uikit-component-authoring`

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
