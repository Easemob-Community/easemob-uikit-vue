# User Info Fetch Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 让双 adapter 用户资料拉取在超限、抖动、重连和缓存热启动场景下可恢复、可诊断，并减少列表订阅与无效请求。

**Architecture:** 保持 core/composable → contract → 双 adapter 单向依赖。Pinia 与 adapter 内置 store 提供同一失败清理契约；domain 负责 own 直连、重试、来源日志和缓存预填；UI 只传结构化触发信息与场景选项。

**Tech Stack:** Vue 3、Pinia、TypeScript、Vitest、pnpm workspace。

**Spec:** `docs/USER-INFO-FETCH-RESILIENCE-PLAN.md`（含“评审修订”）。

## Global Constraints

- 不修改 `easemob-websdk`，所有 SDK internal API 均可缺失降级；请求分片上限固定 100。
- 新公开参数、方法、字段均为 optional，保持现有调用默认行为；唯一下沉的行为变更是指定列表场景不订阅。
- 1600 是会话级订阅熔断，1601 仅影响当前分片；仅明确网络/超时及 429/5xx 自动重试一次，退避 300ms。
- SDK 缓存中实际存在的属性作为本地展示权威；空缓存与 internal API 缺失回退现有 REST 分片。
- P2-2 可见性懒加载不在本轮；不修改版本号、不发版、不自动 Git 提交或推送。

## Review Focus

- own 必须经真实 `useOwnUserInfo` 调用链验证，不能只改未被调用的 domain 方法。
- 重连清理失败状态后，已挂载 composable 能重新拉取；内置 store 不得因 optional 注入而失去恢复能力。
- 缓存只有部分字段时只标记实际存在字段，剩余属性仍需请求。
- 自定义摘要 resolver 不得影响结构化发送者名称的拉取判断。
- 1601、普通 500 与权限错误必须走不同订阅恢复路径。

---

### Task 1: 失败状态清理与重连恢复

**Files:**
- Modify: `packages/uikit-core/src/store/user-info.ts`
- Modify: `packages/uikit-sdk-websdk5/src/event/types.ts`、`event/connection-events.ts`、`adapter/internal-stores/user-info.ts`
- Modify: `packages/uikit-sdk-webim4` 的对应三个文件
- Test: 双 adapter `event/__tests__/connection-events.test.ts`

**Interfaces:**
- Produces: `UserInfoStoreLike.clearFetchFailed?: (userIds?: string[]) => void`；所有内置实现必须提供该方法。
- `onConnected` 调用 `stores.userInfo?.clearFetchFailed?.()`，不主动发 REST，由响应式 composable 重新触发。

- [x] 写失败测试：Pinia/内置 store 支持全量和按 ID 清理；连接 `onConnected` 清理失败集合且现有 client 状态行为不变。
- [x] 跑双 adapter connection 测试，确认因方法缺失而失败。
- [x] 实现 store 方法、事件注入和内置 store 对齐。
- [x] 重跑测试，确认通过。

### Task 2: 自身资料真实独立链路

**Files:**
- Modify: `packages/uikit-sdk-contract/src/domains.ts`
- Modify: 双 adapter `domain/user-info-domain.ts`
- Modify: `packages/uikit-core/src/composables/use-own-user-info.ts`
- Test: 双 adapter `domain/__tests__/user-info-fetch-batching.test.ts`

**Interfaces:**
- Produces: `SdkUserInfoDomain.fetchOwnInfo(attributes?: UserInfoAttribute[]): Promise<UserInfo | undefined>`。
- own 直连单 ID 请求，保留连接、缓存属性、loading 和 failed 判重；不与普通 fetch 微任务队列合并。

- [x] 写失败测试：`fetchOwnInfo()` 与 205 个普通 ID 同 tick 产生 own 1 次 + 普通 3 次请求；own 失败只标记自己。
- [x] 跑测试确认当前 own 被合批而失败。
- [x] 抽出不带重试的单片执行逻辑，实现 own 直连并切换 `useOwnUserInfo`。
- [x] 重跑双 domain 测试与 core 类型检查。

### Task 3: 拉取重试与分级订阅熔断

**Files:**
- Modify: 双 adapter `domain/user-info-domain.ts`
- Test: 双 adapter `domain/__tests__/user-info-fetch-batching.test.ts`

**Interfaces:**
- Consumes: Task 1 `clearFetchFailed` 与 Task 2 单片执行逻辑。
- Produces: 可重试错误仅重试一次、300ms；订阅 1600 全局熔断，1601 与其他普通错误仅标记当前分片。

- [x] 写失败测试：500 首次失败后成功且不标 failed；400/本地 110 不重试；1600 只发一次并熔断；1601/500 继续后续分片且不全局熔断。
- [x] 用 fake timers 运行并确认旧实现失败。
- [x] 实现明确的错误分类、单次退避重试和分级订阅错误处理。
- [x] 重跑测试并恢复真实 timers。

### Task 4: 来源日志与列表订阅选项

**Files:**
- Modify: `packages/uikit-sdk-contract/src/types/user-info.ts`、`domains.ts`
- Modify: `packages/uikit-core/src/composables/use-user-info.ts`、`use-own-user-info.ts`
- Modify: `packages/uikit-im/src/composables/use-user-info.ts`
- Modify: 会话项、联系人列表/列表项、群成员列表项及双 adapter domain
- Test: 双 adapter domain 测试与 core/im 相关纯 TS 测试

**Interfaces:**
- Produces: `UserInfoRequestOptions { source?: string }`；`UseUserInfoOptions extends UserInfoRequestOptions { subscribe?: boolean }`。
- `fetchUserInfos(ids, attrs?, options?)`、`subscribeUserInfos(ids, options?)`、`fetchOwnInfo(attrs?, options?)`；composable 第三参默认 `{ subscribe: true }`。
- 会话项、联系人列表项和群成员列表项传 `subscribe: false`；其他调用默认订阅。flush 日志输出 sources/requested/missing/chunks/failedChunks，不输出完整 ID 列表。

- [x] 写失败测试：source 跨队列聚合、失败日志带 code/httpStatus、subscribe false 不调用订阅且默认行为不变。
- [x] 跑测试确认旧签名/行为不满足。
- [x] 按 contract → 双 adapter → core → im 顺序实现，并给公开参数补中英 JSDoc。
- [x] 跑相关测试与 core/im 类型检查。

### Task 5: SDK 缓存预填与会话映射复用

**Files:**
- Modify: `packages/uikit-sdk-contract/src/repository.ts`
- Create: `packages/uikit-sdk-websdk5/src/adapter/user-info-cache.ts`
- Modify: websdk5 `adapter.ts`、`domain/user-info-domain.ts`、`domain/conversation-domain.ts`
- Modify: `packages/uikit-im/src/modules/conversation/conversation-item.vue`
- Test: websdk5 user-info/conversation/adapter 纯 TS 测试

**Interfaces:**
- Produces: `UserInfoRepository.readCachedUserInfos?: (userIds: string[]) => UserInfo[]`。
- `UserInfoDomain.prefillUserInfos(userIds): UserInfo[]` 读取、入库并仅标记实际存在属性；`ConversationDomain` 新增 `prefillUserInfo?: (userIds: string[]) => void` hook。
- `syncLocal` 在 `toUiConversations` 前预填群发送者；会话摘要发送者仅请求 `['nickname']`。

- [x] 写失败测试：缓存命中 150/205 只请求 55；空缓存仍 100/100/5；部分字段不阻止剩余属性补拉；internal API 缺失/抛错降级；syncLocal 全命中不触发 REST。
- [x] 跑测试确认当前无缓存路径而失败。
- [x] 实现 runtime profile 优先、summary 兜底的安全读取和 domain/conversation 装配。
- [x] 重跑 websdk5 测试与 adapter 构建。

### Task 6: 发送者名称结构化与文档收口

**Files:**
- Modify: `packages/uikit-sdk-contract/src/types/conversation.ts`
- Modify: 双 adapter 所有产生 `lastMessageFrom` 的会话映射/消息代偿路径
- Modify: `packages/uikit-im/src/modules/conversation/conversation-item.vue`、`conversation-item.utils.ts` 和测试
- Modify: `TECH-DEBT.md`、相关 skills、`docs/USER-INFO-FETCH-RESILIENCE-PLAN.md`

**Interfaces:**
- Produces: `UiConversation.lastMessageSenderName?: string`。
- 拉取判断优先使用结构化名称；自定义摘要格式不影响判断。标准 `userId: ` 摘要的异步替换保持兼容。

- [x] 写失败测试：名称已解析不拉、名称等于 ID 拉取、字段缺失按保守回退、自定义 resolver 不改变判断；双 adapter 映射输出名称字段。
- [x] 跑测试确认字段缺失而失败。
- [x] 实现契约和双 adapter 映射，再切换 UI 判断并更新注释/文档。
- [x] 跑全部相关纯 TS 测试、所有受影响包构建和 uikit-im 类型检查；检查工作区不混入产物。

---

## 复审收口（2026-11-18 下午，未新增 commit）

- **4.x 收窄（用户决策）**：4.x 无自动同步/资料缓存，错误码与 5.x 不同源，删除 4.x 自动重试（避免把 `type=2` 鉴权错误当网络错误重试），只保留 100 分片、单片失败标记与重连恢复；失败日志按 4.x 真实形状取 `extraInfo.httpCode` / `extraInfo.errDesc` / `message`。
- **`fetchOwnInfo` 可选化**：契约改为可选方法，`useOwnUserInfo` 在旧 adapter 缺失时回退单 ID `fetchUserInfos`。
- **离线拉取可恢复**：未连接时不再静默丢弃，改为标记失败；重连 `clearFetchFailed` 后响应式 composable 重新拉取（own 同样处理）。
- **摘要 sender 字段同步**：chat 页摘要写入与双 adapter 撤回 patch 一并写 `lastMessageFrom` / `lastMessageSenderName`，并对发送者 ID 做归一化。
- **列表订阅补全**：聊天信息抽屉宫格 + 群管理禁言/黑名单/白名单/入群申请/群文件名单 + 消息气泡/引用/置顶/合并消息项补 `subscribe: false` 与来源标签。
- **文档/类型收口**：`UseUserInfoOptions` 可从 core/im 导入；`UiConversation.lastMessageSenderName` 补类型文档；`group-read-receipt` 补 `source`；根 vitest 收集问题登记 TECH-DEBT D153。
- **验证（2026-11-18 16:10）**：受影响单测 24 文件 / 178 用例通过（含新增 own 链路、重连恢复、4.x 真实错误形状）；contract/core/websdk5/webim4/im 构建全绿；demo `vue-tsc --noEmit` 0 错误；改动新增行 eslint 0 错误。
- **列表/消息级订阅补全后复验**：11 个组件（抽屉宫格 + 群管理 5 类名单 + 消息气泡/引用/置顶/合并消息）改 `subscribe: false` 后 `uikit-im build`（含 vue-tsc 模板检查）通过；新增“群聊撤回同步 sender 字段”回归测试；相关单测 6 文件 / 33 用例通过；新增行 eslint 0 错误。
