# 用户资料拉取链路加固（UIKit 侧）设计执行计划

> 状态：**已实施**（2026-11-18；评审修订与验证记录见 `docs/superpowers/plans/2026-11-18-user-info-fetch-resilience.md`）
> 对应 TECH-DEBT：`TECH-DEBT.md` D152（用户资料回退触发过宽且合批缺少 100 人分片）
> 关联 skill：`uikit-user-attribute-extraction` / `uikit-provider-config` / `uikit-sdk-adapter-architecture` / `uikit-log-analysis`
> **硬约束**：`easemob-websdk`（5.x）不在本次改动范围。所有方案必须建立在「SDK 只会把 `userIds` 原样塞进一个请求」这一现状之上。
> **公开 API 影响**：P0-1/P0-4/P1-4 给用户资料 domain/composable 增加可选方法或参数，P1-1 给 `UserInfoRepository` 增加可选方法，P2-1 给 `UiConversation` 增加可选字段——均向后兼容，统一按 minor API 变更管理。

## 评审修订（2026-11-18）

- 基线 100 人分片、群会话触发收窄与 `enableUserInfoSync` 联动已在 `79cc4c31` 提交，不再视为未提交工作区改动。
- P0-1 必须同时把 `fetchOwnInfo` 补入 `SdkUserInfoDomain` 并将 `useOwnUserInfo` 切换到该方法；own + 205 个发送者的预期请求数是 4（own 1 + 分片 3），不是 2。
- P0-2 仅对明确网络/超时错误及 HTTP 429/5xx 重试，不把所有缺少 `httpStatus` 的错误视为可重试；该重试只在 websdk5 落地（4.x 无自动同步/缓存补位且错误码不同源，不重试）；双 adapter 内置 store 与 Pinia store 都实现 `clearFetchFailed`。
- P0-3 将 1600 视为会话级订阅配额熔断，1601 仅标记当前目标/分片失败，不全局关闭订阅。
- P0-4/P1-4 属公开 API 变更；P1-4 纳入实施与发布清单，不再归入“无公开 API 变更”的 patch 批次。
- P1-1/P1-2 将 SDK 缓存中实际存在的属性视为本地展示权威并标记已覆盖，未命中或缺失属性继续 REST；不再承诺进入详情后必定重查相同属性。SDK internal API 通过结构类型、try/catch 和缺失降级隔离。
- P1-3 从默认 nickname/avatarUrl 改为 nickname 只减少 1 个字段，不是 7 个。
- G4 的热启动零请求以“SDK 缓存完整覆盖首屏所需属性”为前提，不作无条件保证。
- P2-1 只让“是否触发拉取”依赖结构化发送者名称；既有标准摘要的异步前缀替换保留兼容，不承诺消除所有字符串处理。
- 每阶段必须构建所有受影响包，包括 contract/core/双 adapter/uikit-im；Vitest 使用可收集的纯 TS 测试范围，Vue 测试配置问题单独登记，不作为跳过相关测试的理由。
- P2-2 可见性懒加载仍留到下一轮；本轮不修改 SDK、不发布版本。

## 复审收口（2026-11-18 下午）

- 4.x 明确为「只保 100 分片」：4.x 无自动同步/资料缓存，且错误码与 5.x 不同源，删除 4.x 自动重试（避免把鉴权错误当网络错误重试），只保留单片失败标记 + 重连恢复；分片失败日志按 4.x 真实形状取 `extraInfo.httpCode` / `extraInfo.errDesc` / `message`。
- `SdkUserInfoDomain.fetchOwnInfo` 改为可选方法，`useOwnUserInfo` 对旧 adapter 回退单 ID `fetchUserInfos`，避免破坏自定义 adapter。
- 离线发起的拉取改为标记失败（不再静默丢弃），重连 `clearFetchFailed` 后由响应式 composable 补拉；4.x 无同步补位，尤其依赖此路径。
- 摘要就地更新路径（chat 页摘要写入、双 adapter 撤回 patch）同步写 `lastMessageFrom` / `lastMessageSenderName`，避免 P2-1 判断字段与文本脱节。
- 列表订阅补全：聊天信息抽屉宫格、群管理 5 类名单（禁言/黑名单/白名单/入群申请/群文件）与消息气泡/引用/置顶/合并消息项补 `subscribe: false` 与来源标签，覆盖高基数名单与消息流的订阅配额压力。
- 文档/类型收口：`UseUserInfoOptions` 可从 `uikit-core` / `uikit-im` 导入；`UiConversation.lastMessageSenderName` 补类型文档；根 vitest 缺 `@vitejs/plugin-vue` 登记为 TECH-DEBT D153。

---

## 一、背景

线上反馈：「开启用户资料显示与拉取后，本应走 SDK 5.x 自动同步，实际全部走了 fetch 接口；一次传入超过 100 个 userId 被服务端拒绝」。

**已发生的事实（2026-11-18T02-38-19 日志）**：

| 时间 | 事件 | 结论 |
| --- | --- | --- |
| 10:38:10.176 | `getUserInfoByUserId ["900003"]` | SDK 自动同步**开着**（登录后自补自资料） |
| 10:38:10.792 | `getUserInfoByAttribute` 可见 204 个 ID（首个是自己 `900003`） | UIKit 合批：**自身资料 + 200+ 会话发送者**同一请求 |
| 10:38:10.950 | `/metadata/user/get` → **400**，166ms | 服务端 `exceed allowed batch size 100`，整批失败 |
| 10:38:11.164 | 增量 session-list 仅回 **4 条** | SDK 自动补位只覆盖这 4 个发送者 |
| 10:38:11.593 | `/metadata/subscription` → **400** | 订阅服务/配额异常，UIKit 未熔断（判据漏 400 类错误） |

**现状**：工作区已有一版未提交改动（100 分片 + 群会话触发收窄 + `enableUserInfoSync` 联动），能消除 400，但**没有解决"为什么全走 fetch"**，也没有解决失败恢复、订阅噪音、可观测性。

---

## 二、根因（三层）

### 2.1 直接原因：合批无上限

`34c18631` 引入微任务合批后，`flushFetchQueue` 只合并不分片。合批前是 N 个单条请求（吵但都成功），合批后是 1 个巨型请求（一超 100 就整批失败）。

### 2.2 为什么没走"第二通道"

1. `enableUserInfo` 只是 UIKit「要不要主动拉/订阅」的总开关，**不是通道选择器**；UIKit 的用户资料读写完全在自建 store 上，从不读 SDK 缓存。
2. 自动同步只覆盖两条路径：`refreshSessionList()` 的**增量**会话项、以及收到的消息。首屏渲染的是 `getConversationList()` 的**本地缓存 200+ 会话**，永远不进补位队列。
3. 设计文档（`SDK-ADAPTER-ABSTRACTION-PLAN.md` §176）约定 adapter 统一补全会话名/头像，实现里只读 `lastMessage.sender` 与 UIKit store，兜底责任落到视图层 → 才有"200 个 item 各调一次 `useUserInfo`"。

### 2.3 放大器：失败不可恢复 + 订阅无上限

- `markFetchFailed` 只有 `logout` 才清（`clearUserInfos`），一次抖动 = 本次登录永久缺昵称。
- `useUserInfo` 每次调用都订阅，且**卸载不自动退订**；200+ 会话发送者会持续累积订阅，逼近服务端配额（`1600`），而熔断判据只认 `210/403/service_forbidden`，命中 `1600/1601`（HTTP 400）不熔断 → 每个新发送者重复失败。

---

## 三、目标 / 非目标

### 目标

| ID | 目标 | 可验证口径 |
| --- | --- | --- |
| G1 | 任何路径都不再产生 >100 的单次请求 | 分片单测 + 日志断言 |
| G2 | 自身资料与批量拉取解耦 | 同 tick 并发时 own 请求独立、失败互不影响 |
| G3 | 分片失败可自愈 | 网络抖动后重连/重试能恢复昵称，不必重登 |
| G4 | 热启动尽量零请求、冷启动最小请求 | 热启动会话首屏 `metadata/user/get` = 0；冷启动 ≥1 次且都 ≤100 |
| G5 | 可定位 | 日志带 `source` 与 `requested/missing/chunks` |

### 非目标（本轮不做）

- ❌ 改 SDK（分片、错误码映射、补位范围都不动）；
- ❌ 会话列表虚拟化重构（P2-2 单独评估）；
- ❌ 用户资料本地持久化（D85）；
- ❌ 改变 `enableUserInfo` / `enableUserInfoSubscription` 的默认值。

---

## 四、方案总览

四层，全部在 UIKit 仓库内：

```
┌─ 视图层（触发）  conversation-item / contact-list / useUserInfo
│    · 只对"名字未知"的项拉取（结构化字段判断，不解析字符串）
│    · 摘要发送者只拉 nickname；列表场景不订阅
├─ 域层（合批）    UserInfoDomain
│    · own 独立队列、100 分片、失败重试、来源标签
├─ 数据层（缓存）  adapter hook + conversation syncLocal
│    · 读 SDK userInfo 缓存预填 → 摘要直接有名字 → 不触发拉取
└─ 状态层（存储）  userInfo store
     · clearFetchFailed、按属性标记、失败可恢复
```

**请求时序对比**

```
修复前（冷/热启动都一样）：
  200 个 item mount → 200 次 useUserInfo → 合批 1 次(204 ids) → 400 → 全部 markFetchFailed

修复后·热启动（SDK 缓存有资料）：
  syncLocal → 读 SDK 缓存预填 store → 摘要即 nickname → 0 次 REST

修复后·冷启动（缓存为空）：
  syncLocal → 预填无命中 → 200 个 item → 合批 → 100/100/4 三次 → 各自入库
  （P2-2 落地后：只拉首屏可见 ~15 个）
```

---

## 五、阶段计划

> 现有工作区分片改动作为基线保留；以下为增量。

### P0-1 自身资料独立队列

**现状**：`fetchOwnInfo` → `fetchUserInfos([me])`，进入同一个 `fetchQueue`。日志里 204 个 ID 的第一个就是自己，说明自身资料被并入巨型请求，400 时一起丢失。

**改动**（`packages/uikit-sdk-websdk5/src/domain/user-info-domain.ts`、`webim4` 同构）：

```ts
// 抽出单次请求执行体，队列与直连共用
private async fetchChunk(ids: string[], attrs: UserInfoAttribute[]) { /* markLoading → request → 入库/标记 */ }

async fetchOwnInfo(attrs = ALL) {
  const me = this.client.currentUserId
  if (!me || !this.client.isConnected) return undefined
  // 1 个 ID 没有合批价值，只有被连累的风险
  return (await this.fetchChunk([me], attrs))[0]
}
```

**要点**：保留 `areAttributesFetched` / `isLoading` 判重；own 失败只影响自己，不再连坐会话摘要。

**测试**：同 tick 内 `fetchOwnInfo()` + 205 个发送者 → 产生 4 个独立请求（own 1 + 分片 3）；own 请求抛错时 `markFetchFailed` 只含 `[me]`。

**验收**：G2。

---

### P0-2 分片失败重试与重连恢复

**现状**：任一分片失败 → `markFetchFailed(chunk)` → 该批用户本次登录内被永久跳过（`isFetchFailed` 无恢复路径）。

**改动**：

1. `flushFetchQueue` 每片失败后按「可重试」判定重试 1 次（300ms 退避），**仅 websdk5**；4.x 无自动同步/缓存补位，不做自动重试，只保留单片失败标记与重连恢复；
2. 可重试：明确的网络/超时（websdk5 `code ∈ {2,301}` 等）与 HTTP `5xx`/`429`；不可重试：`400/401/403`、`code ∈ {1600,1601}`；**不把「缺少 httpStatus 的任意错误」视为可重试**；
3. `UserInfoStoreLike` 增加可选 `clearFetchFailed?: (userIds?: string[]) => void`（可选保证注入方兼容）；
4. 连接事件 `onConnected` 调用 `stores.userInfo?.clearFetchFailed?.()`；
5. 未连接时的拉取把目标标记为失败（而非静默丢弃），使重连清理后已挂载的响应式 composable 能重新拉取（4.x 无同步补位，尤其依赖此路径）。

**文件**：
- `packages/uikit-core/src/store/user-info.ts`（新增方法）
- `packages/uikit-sdk-websdk5/src/event/types.ts:147`（接口可选方法）
- `packages/uikit-sdk-websdk5/src/event/connection-events.ts:44,48`（`ConnectionEventStores` 增加可选 `userInfo`，`onConnected` 调用）
- `webim4` 对应文件同构

**测试**：首片 500 → 重试成功 → 不 `markFetchFailed`；400 → 不重试；重连后 failed 集合清空。

**验收**：G3。

---

### P0-3 订阅熔断补齐

**现状**：`isPermissionError` 只认 `code===210 / httpStatus===403 / reason==='service_forbidden'`。SDK 错误映射里 `subscriber_limit_exceeded(1600)`、`target_limit_exceeded(1601)` 都是 **400**，不在判据内 → 配额超限时不熔断，每个新发送者继续发必败请求。

**改动**：判据扩展为「会话级不可恢复错误」：`210 / 1600 / 403 / service_forbidden`，命中即 `disableSubscription()` + 仅告警一次；`1601` 只标记当前分片/目标为订阅失败并继续后续分片，不全局关闭订阅。日志补 `code + httpStatus + reason(reasonKey) + message`，便于下次直接对账 10:38:11.593 那次 400。

**测试**：`{code:1600, details:{httpStatus:400}}` → 熔断且只发 1 次；普通 500 → 只标记当前分片，不熔断。

---

### P0-4 拉取/订阅来源标签

**现状**：日志只有裸 `getUserInfoByAttribute`，204 个 ID 的来源只能靠推（D152 自己写了"高概率但未直证"）。

**改动**：

```ts
// domain
fetchUserInfos(ids, attrs, options?: { source?: string })
subscribeUserInfos(ids, options?: { source?: string })
```
```ts
// 公开 composable 增加可选第三参（向后兼容）
useUserInfo(userId, attributes?, options?: { source?: string, subscribe?: boolean })
```

调用点显式传：`conversation-item` → `'conversation-item'`，`contact-list` → `'contact-list'`，`group-read-receipt` → `'read-receipt'`，own → `'own'`。

flush 日志：`{ sources, requested, missing, chunks, failedChunks }`；分片失败：`{ source, chunkSize, code, httpStatus }`。

**测试**：日志断言（mock logger）包含 source 与 chunks。

**验收**：G5。

---

### P1-1 SDK 缓存预填（adapter hook）

**现状**：UIKit 从不读 SDK 的 userInfo 缓存；同一个用户在 SDK 缓存里明明有，却仍发 REST。

**改动**：`UserInfoRepository` 增加可选方法：

```ts
/** 从 SDK 本地缓存读取用户资料（best-effort，缺省视为无缓存） */
readCachedUserInfos?: (userIds: string[]) => UserInfo[]
```

websdk5 实现（结构类型 + try/catch，SDK 内部 API 缺失时静默降级）：

```ts
readCachedUserInfos: (ids) => {
  try {
    const cm = (this._client as unknown as {
      getCacheManager?: () => {
        getRuntimeUserInfo?: (id: string, updateAccess: boolean) => { userId: string, nickname?: string, avatarUrl?: string, sign?: string, ext?: string } | null
        getUserInfoSummaries?: (ids: string[], updateAccess: boolean) => Array<{ userId: string, nickname?: string, avatarUrl?: string, sign?: string, ext?: string }>
      }
    }).getCacheManager?.()
    // runtime profile 优先（字段更全），summary 兜底（nickname/avatarUrl/sign/ext）
    const runtime = new Map(ids.map(id => [id, cm?.getRuntimeUserInfo?.(id, false)]).filter(([, p]) => p))
    const summaries = cm?.getUserInfoSummaries?.(ids.filter(id => !runtime.has(id)), false) ?? []
    return [...runtime.values(), ...summaries].map(toUserInfo)
  } catch { return [] }
}
```

`flushFetchQueue` 流程改为：**预填 → 重算 missing → 分片请求**；只对实际有值的属性 `markFetchedAttributes`。

**风险**：`getCacheManager()` 在 SDK 标了 `@internal`。必须 try/catch + 单测 mock + 注释写明版本 floor；若团队禁止，见决策点 1。

**测试**：缓存命中 150/205 → 仅 1 次 55 人请求；缓存返回空 → 行为等同现状。

**验收**：G4。

---

### P1-2 会话列表映射前预填

**现状**：`ConversationDomain.syncLocal()` 直接 `getConversationList()` → `toUiConversations` → `resolveSenderName` 读 UIKit store（空）→ 摘要落成 `${userId}: xxx` → 200 个 item 各自 `useUserInfo`。

**改动**：`syncLocal` 在 map 之前收集 `lastMessage.sender.userId`，调用新 hook `prefillUserInfo?.(ids)`（内部走 P1-1 的缓存读取 + `setUserInfos`）。预填命中后摘要第一次渲染就是 `${nickname}: xxx`，`shouldFetchLastMessageSender` 全 false。

**文件**：`packages/uikit-sdk-websdk5/src/domain/conversation-domain.ts:119`、`adapter.ts`（hook 装配，`resolveSenderName` 旁）。

**测试**：伪造 200 条本地会话 + 缓存全命中 → `fetchUserInfos` 调用 0 次；缓存全空 → 3 次分片。

**验收**：G4（热启动零请求的主承担者）。

---

### P1-3 摘要发送者只拉 nickname

`conversation-item` 对 `lastMessageSenderUserId` 传 `['nickname']`（摘要不展示发送者头像），减少 7 个字段，避免把 `avatarUrl` 错误标记为"已拉取"。

**测试**：属性断言 `['nickname']`。

---

### P1-4 订阅范围收敛（行为变更，需确认）

**现状**：`useUserInfo` 每次都订阅，且无自动退订；列表项 = 陌生人订阅，200+ 会话会持续占用配额（`1600`）。

**改动**：`useUserInfo` 增加可选 `subscribe`（默认 `true` 保持兼容）；列表与消息级高频场景（会话项、联系人列表、群成员列表、聊天信息抽屉宫格、群管理禁言/黑名单/白名单/入群申请/群文件名单、消息气泡/引用/置顶/合并消息项）传 `false`，只在单聊/名片/详情等单用户场景订阅。可选：为列表项维护 `unsubscribeUsersInfo` 的 LRU 上限。

**影响**：陌生人改昵称时，列表不实时刷新（下次进详情/重进页面才更新）。需产品确认。

---

### P2-1 发送者名称结构化（去掉字符串前缀解析）

**现状**：`shouldFetchLastMessageSender` 用 `lastMessageText.startsWith('${senderId}: ')`，与 `formatConversationPreview` 的格式硬耦合；摘要格式一变（业务 resolver、@ 前缀、deviceId 后缀）就静默失效 → 列表永久显示 userId。

**改动**：

1. `UiConversation` 增加可选字段 `lastMessageSenderName?: string`（contract 公开类型，向后兼容）；
2. `toUiConversation` 写入已解析的 `senderName`；
3. `shouldFetchLastMessageSender` 改为「有名字且不等于 id 就不拉」；
4. `displayMessage` 的前缀替换保留字符串兼容（标准 `${userId}: ` 前缀仍会异步替换为昵称），不承诺消除字符串处理；摘要就地更新路径（chat 页摘要写入、双 adapter 撤回 patch）需同步写 `lastMessageFrom` / `lastMessageSenderName`，避免判断字段与文本脱节。

**影响面**：`@easemob-community/uikit-sdk-contract` + 双 adapter + conversation-item；需按仓库规则先声明公开 API 变更。

**测试**：名字已解析 → 0 请求；名字等于 id → 拉取；自定义 `lastMessageTextResolver` 改格式不影响判断。

---

### P2-2 可见性懒加载（可选，建议下一轮）

会话列表是普通 `v-for`（无虚拟化），冷启动 200 个 item 全挂载。可在列表层加 IntersectionObserver（或"首屏 N 条 + idle 分批"），冷启动请求从 204 → ~15。

**评估**：收益大但改动面在列表容器；建议先看 P1-1/P1-2 上线后的实际热启动/冷启动数据再排期。

---

## 六、文件清单

| 包 | 文件 | 阶段 |
| --- | --- | --- |
| `uikit-core` | `store/user-info.ts`（clearFetchFailed） | P0-2 |
| `uikit-core` | `composables/use-user-info.ts`（options.source / subscribe） | P0-4 / P1-4 |
| `uikit-sdk-websdk5` | `domain/user-info-domain.ts`（own 队列、重试、预填、source、熔断） | P0-1/2/3/4、P1-1 |
| `uikit-sdk-websdk5` | `domain/conversation-domain.ts`（syncLocal 预填） | P1-2 |
| `uikit-sdk-websdk5` | `event/types.ts` / `event/connection-events.ts`（store 可选方法、重连清理） | P0-2 |
| `uikit-sdk-websdk5` | `adapter.ts`（hook 装配） | P1-1/2 |
| `uikit-sdk-websdk5` | `adapter/conversation-adapter.ts`（senderName 落字段） | P2-1 |
| `uikit-sdk-webim4` | 同构：domain / event | P0-1/2/3/4 |
| `uikit-sdk-contract` | `types/conversation.ts`（`lastMessageSenderName?`）、`repository.ts`（`UserInfoRepository` 可选方法） | P1-1 / P2-1 |
| `uikit-im` | `modules/conversation/conversation-item.vue`、`conversation-item.utils.ts` | P1-3 / P2-1 |
| `uikit-im` | `modules/contact/contact-list.vue`、其他 `useUserInfo` 调用点（source/subscribe） | P0-4 / P1-4 |

---

## 七、关键决策点（需确认后才编码）

| # | 决策 | 推荐 | 影响 |
| --- | --- | --- | --- |
| 1 | 是否允许读 SDK `getCacheManager()`（标注 `@internal`） | **允许** + try/catch + 版本 floor 注释 | 决定 P1-1/P1-2 是否存在；禁止则热启动仍需 3 次分片 |
| 2 | 契约新增 `lastMessageSenderName?` | **可接受**（可选字段，minor） | P2-1 成立；否则继续字符串解析 |
| 3 | `useUserInfo` 新增可选 `options` | **可接受** | P0-4 / P1-4 的入口 |
| 4 | 重试策略 | **1 次 / 300ms / 仅可重试错误** | 影响抖动恢复速度与请求量 |
| 5 | 列表场景不订阅（P1-4） | **建议做**，但属行为变更 | 减少配额压力；牺牲列表实时改名 |
| 6 | P2-2 是否纳入本轮 | **下一轮** | 本轮工时 +0.5d |

---

## 八、测试与验收

### 单测矩阵

| 用例 | 期望 |
| --- | --- |
| 205 个 ID | 100/100/5，串行，maxActive=1 |
| own + 205 个发送者同 tick | 4 个独立请求（own 1 + 分片 3），own 不进合批 |
| 首片 500，重试成功 | 不 `markFetchFailed`，全部入库 |
| 首片 400 | 不重试，仅该片 `markFetchFailed` |
| 缓存命中 150/205 | 仅 1 次 55 人请求；属性按缓存值标记 |
| 缓存全空 | 等同现状 3 次分片 |
| 订阅 1600（400） | 熔断 + 只发 1 次 |
| 订阅 500 | 只标记该片，不熔断 |
| 重连 | `fetchFailedSet` 清空；已挂载 composable 重新拉取 |
| 离线期间发起拉取 | 标记失败（非静默丢弃），重连清理后补拉 |
| 摘要已有发送者名 | 0 次 `fetchUserInfos` |
| 自定义 `lastMessageTextResolver` | 不影响"是否拉取"判断 |
| source 标签 | 日志含 source/chunks |

### 手动验收（demo）

1. 200+ 会话账号，清 SDK 缓存登录 → 首屏无 400，昵称分批出现，`metadata/user/get` 每次 ≤100；
2. 再冷启动（有缓存）→ 首屏 0 次 `metadata/user/get`；
3. 断网 → 恢复 → 缺失昵称自动补齐（不重登）；
4. 订阅服务未开通 → 只告警一次，后续不再请求。

### 日志断言

`[UserInfoDomain] fetch { sources, requested, missing, chunks, failedChunks }` 与 `[UserInfoDomain] chunk failed { source, chunkSize, code, httpStatus, reason, message }` 可在 log-store 导出中检索（4.x 的 httpStatus 取自 `extraInfo.httpCode`、reason 取自 `extraInfo.errDesc`）。

### 每阶段验证门禁（按仓库规则）

```bash
pnpm exec vitest run packages/uikit-sdk-websdk5 packages/uikit-sdk-webim4 packages/uikit-im
pnpm -F @easemob-community/uikit-sdk-websdk5 build
pnpm -F @easemob-community/uikit-sdk-webim4 build
pnpm -F @easemob-community/uikit-im exec vue-tsc --noEmit
pnpm exec eslint <本次改动文件>
```

> 根级 `vitest run packages/...` 仍有 3 个 `.vue` 套件因缺 `@vitejs/plugin-vue` 无法收集（已登记 TECH-DEBT D153）；门禁用按包/目录的 `vitest run <dir>` 结果，不以根级全量命令为准。
四个命令全绿才算完成；`dist/` 不进暂存区。

---

## 九、风险与回滚

| 风险 | 等级 | 缓解 |
| --- | --- | --- |
| SDK `getCacheManager` internal API 变动 | 中 | 结构类型 + try/catch + 单测 mock；缺失时自动降级为现状 |
| 重试放大请求量 | 低 | 仅 1 次、仅可重试错误、300ms 退避 |
| 列表不订阅导致改名不实时 | 低 | 决策点 5 确认；进入详情/重开列表刷新 |
| 契约新增字段影响下游 | 低 | 可选字段；minor 版本；文档标注 |
| 预填缓存与真实数据不一致（陈旧昵称） | 中 | 仅用于摘要展示；进入聊天/详情仍会按属性补拉；`getUserInfoSummaries(ids, false)` 不刷新访问时间 |

**回滚**：按阶段独立提交，单阶段可 revert；P1-1/P1-2 可用「hook 不装配」一键关闭（代码里保留 `readCachedUserInfos` 缺失即跳过）。

---

## 十、提交拆分 / 工时 / 发布

| # | 提交 | 内容 | 工时 |
| --- | --- | --- | --- |
| 0 | `fix(user-info): 用户资料拉取按 100 分片并收窄群会话触发` | **现有工作区 diff**（基线，先单独提交，不掺入后续改动） | — |
| 1 | `fix(user-info): 自身资料独立拉取并隔离批量失败` | P0-1 | 0.5h |
| 2 | `fix(user-info): 分片失败重试与重连恢复` | P0-2 | 2h |
| 3 | `fix(user-info): 订阅熔断覆盖配额类错误` | P0-3 | 0.5h |
| 4 | `feat(user-info): 拉取来源标签` | P0-4 | 1h |
| 5 | `feat(user-info): 优先复用 SDK 本地资料缓存` | P1-1 + P1-2 + P1-3 | 5h |
| 6 | `refactor(conversation): 摘要发送者名称结构化` | P2-1 | 3h |
| 7 | `docs: 计划与 D152 收口` | 文档 + changelog | 1h |

合计约 **1.5–2 人日**（不含 P2-2）。

**发布建议**：

- 第一批（提交 0–4，无公开 API 变更）：`core 2.13.1` / `websdk5 1.6.3` / `webim4 1.4.4` / `im 3.13.1` patch；
- 第二批（提交 5–6，新增可选字段/方法）：`contract 1.6.0` / `core 2.14.0` / `websdk5 1.7.0` / `webim4 1.5.0` / `im 3.14.0` minor；
- 发版后同步：TECH-DEBT D152 补充"UIKit 侧收口"、两个 skill 的规范段、根 CHANGELOG。

---

## 附录 A：关键代码位置

| 位置 | 作用 |
| --- | --- |
| `packages/uikit-sdk-websdk5/src/domain/user-info-domain.ts:70` | `fetchUserInfos` 入队 |
| `.../user-info-domain.ts:94` | `flushFetchQueue` 合批主体 |
| `.../user-info-domain.ts:114` | 100 分片循环（现有改动） |
| `.../user-info-domain.ts:263` | `isPermissionError` 熔断判据 |
| `.../user-info-domain.ts:278` | `fetchOwnInfo`（P0-1 改造点） |
| `packages/uikit-core/src/store/user-info.ts:76` | `markFetchFailed`（P0-2 配套） |
| `packages/uikit-sdk-websdk5/src/event/connection-events.ts:48` | `onConnected`（重连清理挂点） |
| `packages/uikit-sdk-websdk5/src/domain/conversation-domain.ts:119` | `syncLocal`（P1-2 预填挂点） |
| `packages/uikit-sdk-websdk5/src/adapter.ts:289` | `resolveSenderName` |
| `packages/uikit-im/src/modules/conversation/conversation-item.vue:85` | 群发送者触发点（现有改动） |
| `packages/uikit-im/src/modules/conversation/conversation-item.utils.ts:4` | 前缀判断（P2-1 改造点） |
| `packages/uikit-core/src/composables/use-user-info.ts:17` | 开关与订阅入口 |

## 附录 B：日志证据

- `easemob-uikit-logs-2026-11-18T02-38-19.log`
  - L29–L30：登录后 `getUserInfoByUserId ["900003"]`（自动同步开启）
  - L37–L38：`getUserInfoByAttribute` 204+ ID（日志 2048 字符截断，实际更多）
  - L73/L78：`metadata/user/get` 200 / 400
  - L89：增量 session-list 4 条
  - L94–L106：`subscribeUsersInfo` → 400
- 服务端响应：`{"timestamp":1794888684432,"desc":"exceed allowed batch size 100","duration":0}`

## 附录 C：压测记录（2026-11-18，991 条单聊会话）

日志：`easemob-uikit-im-logs-2026-11-18T09-03-10 (1).log`（3408 行 / 2.5MB，16:27–17:03）

| 指标 | 实测 | 结论 |
| --- | --- | --- |
| 会话列表更新 | 1001 次，count 0 → 991 | 会话为**增量创建**（约 10 条/秒，峰值 40 条/秒） |
| 新建会话 | 987 个单聊（`lp1`…`lp1986`，有空洞） | **全程 0 个群会话** |
| `UserInfoDomain fetch` | 96 次 flush；requested 954 / missing 953 / chunks 95 / failedChunks 0 | 无失败 |
| 单次最大 requested | **20**（分布：10×80、20×7、2×5、1×4） | **100 分片未被触达**（chunks 恒为 1） |
| 缓存预填命中 | 1 / 954 | 全新用户，符合预期 |
| 订阅 | 3 次（列表项已 `subscribe:false`） | 符合预期 |
| 分片失败 | 0 | 无 400 迹象 |
| Presence | 17 次 `subscribePresence` 400 `illegal_argument`（首次 count=742） | **新问题**：presence 未分批、每新增会话重试 |
| 日志放大 | ChatEvents 占 2.49MB（98%），1001 次全量 `getConversationList raw` | 压测下本身有开销 |

### C.2 退出重登（`easemob-uikit-im-logs-2026-11-18T09-14-48.log`，17:13）

| 时间 | 事件 |
| --- | --- |
| 17:13:55.271 | `onConnected` → `clearFetchFailed()`，所有已挂载会话项重新求值 |
| 17:13:55.313 | `onConversationListUpdate` **count 跳变 1003 → 1004**（本地缓存一次性挂载） |
| 17:13:56.016 | 首个分片请求（距列表更新 703ms，含 1004 项渲染耗时） |
| 17:13:58.027 | 末个分片 200 返回；`fetch { requested:1003, missing:1003, chunks:11, failedChunks:0 }` |

- 11 个分片 = 10×100 + 1×3；`getUserInfoByAttribute` 共 12 次（11 分片 + 1 次单条独立 flush），**全部 200**，无 `exceed allowed batch size 100`、无 `chunk failed`；
- 端到端（connected → 最后一片返回）约 **2.76s**，其中首屏挂载 1004 项约占 0.7s；
- `missing=1003` 只代表「请求属性未被缓存完全覆盖」（会话项默认要 nickname+avatarUrl），**不等于预填未命中**；建议 flush 日志补 `prefilled` 计数以便区分；
- presence 在同一时刻再次 400：1004 个单聊 ID 单次订阅被拒，重登后 8 次失败（17:13:56 → 17:14:36），与 C.1 结论一致。

### C.3 群会话场景（`easemob-uikit-im-logs-2026-11-18T09-54-39.log`，17:50–17:54）

| 指标 | 实测 |
| --- | --- |
| 会话总量 | 1360（17:52:22.628 reset=true 一次性挂载） |
| `fetch` | `{ requested:1004, missing:1004, chunks:11, failedChunks:0 }`（17:52:27.108） |
| 分片请求 | 12 次 `getUserInfoByAttribute`（11 分片 + 1 单条）+ 1 次 `getUserInfoByUserId`，**全部 200** |
| 耗时 | connected 22.587 → 末片 27.108 ≈ **4.5s**（100 人片最长 ~1s，11 片串行约 3s） |
| 群会话 | `conversationName` 已解析（如「测试群组-545」），`lastMessage.sender` 只有 `{userId:'lp'}`、**无 nickname** |
| 群发送者 | 37 条群消息、全部来自同一个 `lp` → 去重后**仅 1 个 userId** |
| presence | **124 次 400**（62 次 subscribe + 62 次 query），17:50:20 → 17:53:06，持续重试 |

**结论**：1000+ 规模的批量挂载与分片再次通过；但**群发送者路径没有真正压到**——所有群会话的最后一条消息都来自同一个账号，去重后只贡献 1 个 ID。原始线上 204 个 ID 的前提是「N 个群各有一个不同的发送者」，本轮数据不满足。

**未覆盖的验证路径**（下轮必测）：

1. **冷启动批量挂载**：991/2000 条会话存在后刷新页面 → 期望 `requested ≈ 总量`、`chunks ≈ 20`、单次 ≤100、`failedChunks=0`；这是原始 204 ID 故障的真实路径。
2. **群会话发送者**：造 200+ 不同发送者的群会话，验证 `lastMessageSenderName` 回退与分片。
3. **断网恢复**：验证重试与 `onConnected` 清失败集合。
