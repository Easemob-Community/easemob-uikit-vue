# 代码审查建议 — 7 项能力补齐（19 个文件）

> 审查日期：2026-08-04
> 审查范围：16 个修改文件 + 3 个新增文件的未提交变更
> 核心任务：时间分割线语义化 / 头像间距可配置 / 头像 @提及 / 消息搜索 / 撤回他人消息 / 群详情菜单 / 邀请持久化

## Critical（必须修复，1 项）

### 1. `useMessageSearch` 接收配置快照，运行时 props 变更不生效

- **文件**：`packages/uikit/src/modules/chat/message-search/message-search-panel.vue` L29-L34
- **说明**：`useMessageSearch(searchOptions.value)` 在 setup 中对 computed 一次性求值，拿到静态普通对象。消费者运行时改变 `enableServerSearch` / `pageSize` 时 composable 内部读不到新值。
- **建议**：将 composable 改为接受 `MaybeRef<UseMessageSearchOptions>`，内部通过 `unref` 或 `toRef` 保持响应式追踪。

---

## Warnings（应该修复，5 项）

### 2. 搜索面板关闭后状态未重置

- **文件**：`packages/uikit/src/modules/chat/message-search/message-search-panel.vue`
- **说明**：面板关闭后 `keyword` / `results` 保持旧值，再次打开会显示上一次的搜索结果。
- **建议**：在面板关闭（`close` emit 或 `@update:show=false`）时调用已有的 `reset()`

### 3. `loadMore` 中 `pageNum` 超前递增，请求失败时跳页

- **文件**：`packages/uikit/src/composables/use-message-search.ts` L219-L224
- **说明**：`loadMore()` 先 `pageNum += 1` 再调 `search(true)`，若 SDK 调用异常导致 `searchServer` catch 返回 `[]`，`pageNum` 已递增但该页数据缺失，下次 `loadMore` 会跳过该页。
- **建议**：将 `pageNum += 1` 移到 `search(true)` 请求成功后再执行，或至少放到 try 块内部。

### 4. 头像右键菜单锚点 DOM 可能泄漏

- **文件**：`packages/uikit/src/modules/chat/message-item/message-bubble-wrapper.vue` L681-L689
- **说明**：`Popup` 的 `@update:show` 直接赋值 `showAvatarMenu`，不清理锚点；仅 `@close` 走 `closeAvatarMenu()` 移除 DOM。若 Popup 关闭路径只触发 `@update:show=false`，锚点 div 残留在 `document.body`。
- **建议**：`@update:show` 回调中也调用 `closeAvatarMenu()`（参照 `message-interactive.vue` 的做法）。

### 5. `onBeforeUnmount` 重复注册

- **文件**：`packages/uikit/src/modules/chat/message-item/message-bubble-wrapper.vue` L210-L212 和 L345-L350
- **说明**：两个独立的 `onBeforeUnmount` 钩子都包含 `bodyResizeObserver?.disconnect()`，功能无实质错误但冗余，长期维护易混淆。
- **建议**：合并为一个 `onBeforeUnmount`。

### 6. 邀请持久化存在两套独立存储机制

- **文件**：`packages/uikit/src/composables/use-uikit.ts` L116-L125
- **说明**：新增 `watch(inviteList)` + `invite-storage.ts`（key: `uikit:invites:{userId}`）与已有 `useInvitePersistence.ts`（不同 key）是两套独立的 localStorage 方案，同时激活会双写数据、增大不一致风险。
- **建议**：确认 `useInvitePersistence.ts` 是否仍被使用；若已废弃，移除或标记 deprecated。

---

## Suggestions（建议优化，1 项）

### 7. `canRecallOther` 依赖的群数据可能未加载

- **文件**：`packages/uikit/src/modules/chat/message-item/message-interactive.vue` L63-L80
- **说明**：`groupStore.getGroupById(groupId)` 在群信息未预加载时返回 `undefined`，此时 `canRecallOther` 始终为 `false`。`chat.vue` 虽有预拉逻辑，但无法覆盖所有入口场景（如通知跳入）。
- **建议**：当 group 为 undefined 时，可降级调用 SDK 查询群角色，或从消息中携带的角色信息中获取。

---

## 验证清单

- [ ] `pnpm -F @easemob/uikit exec vue-tsc --noEmit` — 0 错误
- [ ] `pnpm -F @easemob/uikit build` — 构建通过
- [ ] 搜索面板：打开 → 输入关键词 → 关闭 → 再次打开，确认结果已清空
- [ ] 头像右键：多次右键不同头像，确认无残留锚点 DOM
- [ ] `loadMore` 异常场景：断网后滚动到底部，确认页码不跳
- [ ] 邀请持久化：切换账号登录，确认邀请记录按用户隔离
