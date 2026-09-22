# Phase 1 防腐层收口：文件改动清单 + 契约类型骨架

> 状态：**施工图**（Phase 1 启动前逐项执行；`TECH-DEBT D122` 的实施落地篇）
> 关联：`docs/SDK-ADAPTER-ABSTRACTION-PLAN.md`（设计/决策），本文是它的 Phase 0/1 施工细化。
> 目标：把 `easemob-websdk` 从 core 与 uikit-im 中剥离，收敛到「契约包 + websdk5 adapter」，**5.x 行为与 UI 不变**。
> 修订（基于 `easemob-websdk@4.24.2` 源码核对）：中立消息 ID 沿用 `msgServerId`/`msgLocalId`（UI 零改名）；`SdkConfig` 加 `adapterConfig` 透传槽；`MessageRepository` 补操作面；Provider 保留 `appKey`/`sdkConfig` 快捷方式（非 breaking）；UMD 全局名修正（4.x=`WebIM`、5.x=`Easemob`）；新增 adapter 反依赖解耦、`UIKitDataSource` deprecated 过渡、core 隔离门禁扩展。
> **SDK 源码参考（只读）**：4.x `/Users/neohuang/Desktop/WorkCommonUse/SDK/websdk/packages/IM/sdk`（`easemob-websdk@4.24.2`，入口 `src/entry.ts`）；5.x `/Users/neohuang/Desktop/WorkCommonUse/SDK/websdk2`（入口 `src/index.ts`，git HEAD 对应 5.0.0 线）。软链锚点 `tmp/sdk-ref/websdk4|websdk5`（gitignored）。施工中核对 SDK 行为一律进源码，禁止凭记忆。

---

## 一、契约类型骨架（新建 `@easemob-community/uikit-sdk-contract`）

> 原则：**中立类型以 5.x 字段命名为基准**（保 UI 零改动）；`SdkMessage`/`MessageBody` 为「本地复刻」，字段名沿用 5.x；4.x adapter 负责把 4.x `body` 判别联合映射到这套命名。凡标注「迁移现有 core `sdk/types.ts`」的类型，可从现文件原样搬入。

### 1.1 `src/types/message.ts`

```ts
import type { ConversationTypeValue, MessageTypeValue } from '../constants'

/** UI 展示层消息状态（与 SDK 解耦；由 adapter 从 sendStatus/isPeerRead 推导） */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type SdkSendStatus = 'sending' | 'sent' | 'failed'

/** 中立消息：两代 SDK 都映射到该形状；字段名以 5.x 为基准 */
export interface SdkMessage {
  /** 服务端消息 ID：4.x `id` → msgServerId；5.x `msgServerId`（沿用现有 UI 字段名，UI 零改动） */
  msgServerId?: string
  /** 本地临时 ID（发送中）：5.x `msgLocalId`；4.x `SendMsgResult.localMsgId` */
  msgLocalId?: string
  from: string
  to: string
  conversationId: string
  conversationType: ConversationTypeValue
  type: MessageTypeValue
  body: MessageBody
  ext?: Record<string, unknown>
  timestamp: number
  sendStatus: SdkSendStatus
  /** 单聊已读/送达（4.x 单聊消息体 `isRead`/`isDelivered` 映射） */
  isPeerRead?: boolean
  isPeerDelivered?: boolean
  /** 群已读人数（5.x `groupReadCount`；4.x 需 `getGroupMsgReadUser` 补） */
  groupReadCount?: number
}

/** 消息体判别联合：结构型（字段名 = 5.x），不带统一 `type` 判别字段，UI 按 `body.xxx` 读取 */
export type MessageBody =
  | TextMessageBody
  | ImageMessageBody
  | FileMessageBody
  | VoiceMessageBody
  | VideoMessageBody
  | LocationMessageBody
  | CmdMessageBody
  | CustomMessageBody
  | CombineMessageBody

export interface TextMessageBody { content: string; translateText?: string }
export interface ImageMessageBody { thumbnailUrl?: string; originalImageUrl?: string; localUrl?: string; width?: number; height?: number; fileSize?: number }
export interface FileMessageBody { url?: string; filename: string; fileSize?: number }
export interface VoiceMessageBody { url?: string; duration: number }
export interface VideoMessageBody { url?: string; thumbnailUrl?: string; duration: number; width?: number; height?: number }
export interface LocationMessageBody { latitude: number; longitude: number; address?: string }
export interface CmdMessageBody { action: string; params?: Record<string, unknown> }
export interface CustomMessageBody { event: string; params?: Record<string, unknown> }
export interface CombineMessageBody { title: string; summary: string; messageList?: SdkMessage[]; url?: string; secret?: string; filename?: string; combineLevel?: number }

/** 流式消息元信息（中立化，替代 SDK `StreamMessageMeta`） */
export interface StreamMessageMeta {
  status: 'start' | 'inProgress' | 'completed' | 'error'
  customType?: string
  deltaText?: string   // 增量（5.x 语义）
  fullText?: string    // 累计全文（5.x 语义）
  errorType?: number
  finishReason?: number
}

/** UI 扩展字段：迁移现有 core `sdk/types.ts` 的 `UiMessageExtension`，`stream` 类型改中立 */
export interface UiMessageExtension {
  isSelf: boolean
  status: MessageStatus
  localId?: string
  requireGroupAck?: boolean
  groupMemberCount?: number
  recalled?: boolean
  recalledBy?: string
  originalMsg?: string
  pinned?: boolean
  pinTime?: number
  pinOperatorId?: string
  translation?: { text: string, to: string }
  showTranslation?: boolean
  translating?: boolean
  voiceText?: { text: string }
  showVoiceText?: boolean
  voiceTranscribing?: boolean
  failReason?: string
  progress?: number
  modified?: boolean
  stream?: StreamMessageMeta
}

/** UIKit 层消息 */
export type UiMessage = (SdkMessage & UiMessageExtension) | UiNoticeMessage

/** 本地系统通知（迁移现有 core `sdk/types.ts` 的 `UiNoticeMessage`/`NoticeMessageBody`） */
export interface UiNoticeMessage { /* ...迁移现有定义... */ }

/** 类型守卫（从现有 core `sdk/types/message.ts` 的结构型守卫原样迁移，字段名不变）。
 * ⚠️ 对 adapter 的硬约束：4.x adapter 输出的中立 body **只能包含对应中立接口声明的字段**，
 * 不得透传 4.x 原始字段（如 `thumb`/`length`/`msg`/`addr`）——结构型守卫靠字段存在性判别，
 * 多余字段会导致误判（详见主计划「七、风险」第 8 条）。 */
export function isTextBody(body: MessageBody): body is TextMessageBody { return 'content' in body }
export function isImageBody(body: MessageBody): body is ImageMessageBody { return 'localUrl' in body }
export function isFileBody(body: MessageBody): body is FileMessageBody { return 'url' in body && !('duration' in body) && !('localUrl' in body) }
export function isVoiceBody(body: MessageBody): body is VoiceMessageBody { return 'duration' in body && !('thumbnailUrl' in body) && !('width' in body) }
export function isVideoBody(body: MessageBody): body is VideoMessageBody { return 'duration' in body && ('thumbnailUrl' in body || 'width' in body) }
export function isLocationBody(body: MessageBody): body is LocationMessageBody { return 'latitude' in body && 'longitude' in body }
export function isCustomBody(body: MessageBody): body is CustomMessageBody { return 'event' in body }
export function isCombineBody(body: MessageBody): body is CombineMessageBody { return 'title' in body && 'summary' in body }
export function isCmdBody(body: MessageBody): body is CmdMessageBody { return 'action' in body }
```

### 1.2 `src/types/conversation.ts` / `contact.ts` / `group.ts` / `presence.ts` / `user-info.ts`

```ts
// conversation.ts —— 迁移现有 core `sdk/types.ts` 的 `UiConversation`（已中立，原样搬入）
export interface UiConversation {
  id: string
  name: string
  avatar?: string
  type: ConversationTypeValue
  unreadCount: number
  lastMessageText: string
  lastMessageFrom?: string
  lastMessageTime?: number
  isPinned: boolean
  pinnedTime?: number
  isMuted: boolean
  marks: number[]
  draft?: string
  draftTime?: number
  remindType?: string
}

// contact.ts —— UiContact / SdkContactSource / UiContactInvite（迁移现有 core `sdk/types.ts`）
// group.ts —— UiGroup / UiGroupMember / CreateGroupParams / SdkGroupSource（迁移现有）
// presence.ts —— UiPresence（迁移现有）
// user-info.ts —— 中立 UserInfo（替代 SDK `UserInfo`：userId/nickname/avatarUrl/sign/ext）
export interface UserInfo {
  userId: string
  nickname?: string
  avatarUrl?: string
  sign?: string
  ext?: Record<string, unknown>
}
export interface UserInfoAttribute { userId: string; nickname?: string; avatarUrl?: string }
```

### 1.3 `src/events.ts`

```ts
import type { SdkMessage, UiConversation, ConversationTypeValue } from './types'

export type ConnectState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'reconnectFailed'

export interface ReceiptEventPayload {
  conversationId: string
  conversationType: ConversationTypeValue
  messageIds: string[]
  timestamp: number
}

/** 中立事件集：uikit-im 订阅它写 store；adapter 把 SDK 事件翻译成这些再回调 */
export interface SdkEventHandlers {
  onConnectStateChange?: (state: ConnectState) => void
  onTokenWillExpire?: () => void
  onTokenExpired?: () => void
  onMessage?: (msg: SdkMessage) => void
  onConversationChange?: (conversations: UiConversation[]) => void
  onMessageReceipts?: (receipts: ReceiptEventPayload[]) => void
  onRecall?: (payload: { messageId: string; conversationId: string; conversationType: ConversationTypeValue }) => void
  onMessageUpdated?: (msg: SdkMessage) => void
  // TODO：onPresenceChanged / onContactChanged / onGroupChanged / onPinnedMessageChanged 等按需补齐
}
```

### 1.4 `src/repository.ts`

```ts
import type { SdkMessage, UiConversation, UiContact, UiGroup, UiPresence } from './types'

export interface MessageRepository {
  loadMessages(params: { conversationId: string; cursor?: string; pageSize?: number }): Promise<{ list: SdkMessage[], cursor?: string, hasMore: boolean }>
  // —— 写/操作面：对应现有 MessageDomain 全部公开方法（sendText/sendImage/sendFile/sendVoice/
  //    sendVideo/sendLocation/sendCustom/sendCmd/sendCombine/recall/markRead/markMessagesRead/
  //    markConversationRead/modifyText/getGroupReadReceiptUsers 等），Phase 1 逐项落地 ——
  //    详见主计划「2.9 操作面」；4.x 侧注意：群聊 markConversationRead 的 channel 消息需 `mid`。
  // TODO（Phase 3 DB 接入时补）：saveMessage / updateMessageStatus / recallMessage
}
export interface ConversationRepository {
  fetchConversations(params: { cursor?: string; pageSize?: number }): Promise<{ list: UiConversation[], cursor?: string, hasMore: boolean }>
}
export interface ContactRepository { /* fetchContacts / fetchBlocklist / addContact / searchUsers —— 由旧 UIKitDataSource 迁移 */ }
export interface GroupRepository { /* fetchGroups / createGroup / fetchGroupInfo —— 由旧 UIKitDataSource 迁移 */ }
export interface PresenceRepository { /* fetchPresence / subscribePresence / unsubscribePresence —— 由旧 UIKitDataSource 迁移 */ }
```

### 1.5 `src/capabilities.ts` / `src/config.ts` / `src/adapter.ts`

```ts
// capabilities.ts
export interface SdkCapabilities {
  combineMessage: boolean
  pinnedMessage: boolean
  streamingMessage: boolean
  groupReadReceipt: boolean
  // TODO 按需扩充
}

// config.ts —— 中立初始化配置，只含 SDK 无关字段
export interface SdkConfig {
  appKey: string
  userId: string
  token: string
  debug?: boolean
  /**
   * SDK 特定配置透传槽：现有 `sdkConfig` 的 `enableSyncData`/`deviceId`/
   * `enableUserInfoSync`/`managers`（chatroom 的 ChatRoomManager 注入也走这里）等
   * 字段经此透传给 adapter.init，不进中立契约约束（详见主计划决策 15）。
   */
  adapterConfig?: Record<string, unknown>
}

// adapter.ts —— 两代 adapter 共同实现此接口
import type { SdkConfig } from './config'
import type { SdkCapabilities } from './capabilities'
import type { SdkEventHandlers } from './events'
import type { MessageRepository, ConversationRepository, ContactRepository, GroupRepository, PresenceRepository } from './repository'

export interface SdkAdapter {
  init(config: SdkConfig): Promise<void>
  login(user: string, token: string): Promise<void>
  logout(): Promise<void>
  /** 订阅中立事件，返回取消订阅函数 */
  subscribe(handlers: SdkEventHandlers): () => void
  readonly capabilities: SdkCapabilities
  readonly message: MessageRepository
  readonly conversation: ConversationRepository
  readonly contact: ContactRepository
  readonly group: GroupRepository
  readonly presence: PresenceRepository
}
```

---

## 二、文件改动清单

> 标记：【新建】【迁移】= 代码从 A 移到 B（不改逻辑，只改 import 来源）；【修改】= 改内容；【删除】= 移除。

### A. 新建 `packages/uikit-sdk-contract/`（契约包，无 SDK 依赖）

| 文件 | 动作 |
| --- | --- |
| `package.json` / `tsconfig.json` / `vite.config.ts` | 【新建】 |
| `src/index.ts` | 【新建】出口：types/events/repository/capabilities/config/adapter |
| `src/constants.ts` | 【迁移】从 core `constants` 抽出中立枚举（`ConversationTypeValue` 等） |
| `src/types/message.ts` / `conversation.ts` / `contact.ts` / `group.ts` / `presence.ts` / `user-info.ts` | 【新建】见第一节 |
| `src/events.ts` / `repository.ts` / `capabilities.ts` / `config.ts` / `adapter.ts` | 【新建】见第一节 |

### B. 新建 `packages/uikit-sdk-websdk5/`（SDK5 adapter，唯一 import `easemob-websdk@^5.0.0` 的地方）

| 文件 | 动作 |
| --- | --- |
| `package.json`（依赖 `easemob-websdk@^5.0.0` + `@easemob-community/uikit-sdk-contract`）/ `tsconfig.json` / `vite.config.ts` | 【新建】 |
| `src/index.ts` | 【新建】导出 `Websdk5Adapter` |
| `src/adapter.ts` | 【新建】`Websdk5Adapter implements SdkAdapter`：`init`(ChatClient.init) / `login` / `logout` / `subscribe`(addEventHandler → 翻译 → 回调) |
| `src/client.ts` | 【迁移】core `sdk/client.ts` 的 `ChatClient` 初始化/生命周期逻辑 |
| `src/adapter/message-adapter.ts` 等 | 【迁移】im `sdk/adapter/*`（`toUiMessage` 等） |
| `src/domain/message|conversation|contact|group-domain.ts` | 【迁移】im `sdk/domain/*` |
| `src/domain/presence-domain.ts` / `user-info-domain.ts` | 【迁移】core `sdk/domain/*` |
| `src/event/chat|contact|group|presence-events.ts` + `registry.ts` | 【迁移】im `sdk/event/*` |
| `src/event/connection-events.ts` | 【迁移】core `sdk/event/connection-events.ts` |

### C. core 中立化（`packages/uikit-core/`，移除 SDK import）

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `sdk/types.ts` | 【修改】`UiMessage` 改 extend 中立 `SdkMessage`（from contract）；删除 `import ... from 'easemob-websdk'`；`UiMessageExtension.stream` 用中立 `StreamMessageMeta` | 删除 `export type { GroupMemberEntry, GroupMuteEntry } from 'easemob-websdk'`，改 contract |
| `sdk/types/message.ts` | 【迁移】body 类型 + 守卫迁到 contract；本文件改 re-export 或【删除】 | |
| `sdk/client.ts` | 【迁移】`UIKitClient` 下沉 websdk5 adapter；`ManagerHost`/`ClientConfig` 改中立接口或随迁删除 | |
| `composables/use-uikit.ts`（core） | 【修改】`useCoreUIKitProvider` 不再 `createClient`，改为接收 adapter 实例并编排其生命周期（`adapter.init/login/logout` + `subscribe` 桥接 core stores）；`PresenceDomain`/`UserInfoDomain` 改为面向 `adapter.presence`/`adapter.contact` 实现，**不下沉 adapter** | **core 职责重构关键点，见主计划「2.9 装配机制」** |
| `sdk/domain/presence-domain.ts` / `user-info-domain.ts` | 【迁移】下沉 websdk5 adapter | `PresenceInfo`/`UserInfo` import 改中立 |
| `sdk/event/connection-events.ts` | 【迁移】下沉 websdk5 adapter | `ConnectionEventHandlerMap` import 移除 |
| `sdk/event/notice-utils.ts` | 【修改】`UserInfo` import → contract 中立类型 | |
| `store/user-info.ts` | 【修改】`UserInfo` → contract | |
| `utils/sdk-error.ts` | 【迁移】`isSDKError`（SDK5 专属）下沉 websdk5 adapter；core 保留中立错误类型 | |
| `utils/sdk-log-capture.ts` | 【修改】`import('easemob-websdk').setLogLevel` 动态 import 下沉 adapter（或经注入钩子） | |
| `composables/types.ts` | 【修改】`UserInfo` → contract；`UIKitDataSource` 迁移为 repository 接口（规划为最新形式，见计划 2.5） | |
| `composables/use-user-info.ts` / `use-own-user-info.ts` | 【修改】`UserInfoAttribute` → contract | |
| `index.ts` | 【修改】re-export 改经 contract；移除 SDK 专属符号 | |
| `package.json` | 【修改】删 `easemob-websdk` 依赖；加 `@easemob-community/uikit-sdk-contract` | |
| `vite.config.ts` | 【修改】删 `getSdkVersion`/`external: easemob-websdk`/`globals: Easemob` | |

### D. im 剥干净（`packages/uikit-im/`，零 SDK 直接依赖）

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `composables/use-uikit.ts` | 【修改】删 6 个 manager 构造器 value import；改注入 `SdkAdapter`（Provider 传入） | **关键运行时解耦点** |
| `sdk/index.ts` | 【修改】re-export 改经 contract / websdk5 adapter | |
| `sdk/adapter/*`（4 文件 + index） | 【迁移】下沉 websdk5 adapter | |
| `sdk/domain/*`（4 文件 + index） | 【迁移】下沉 websdk5 adapter | |
| `sdk/event/*`（5 文件） | 【迁移】下沉 websdk5 adapter | |
| `sdk/notification-engine.ts` | 【修改】`Message` → contract `SdkMessage` | |
| `store/message.ts` / `store/group.ts` | 【修改】`Message`/`UserInfo` → contract | |
| `composables/use-chat.ts` / `use-message-actions.ts` / `use-user-info.ts` / `use-blocklist.ts` | 【修改】`Message`/`UserInfoAttribute` → contract | |
| `containers/uikit-provider/uikit-provider.vue` | 【修改】`UserInfo` → contract；新增 `adapter` prop；**保留 `appKey`/`sdkConfig` 旧 props 作 websdk5 快捷方式**（未传 adapter 时内部 `new Websdk5Adapter()`，传了以 adapter 为准并告警，见主计划「2.9 Provider props 兼容策略」）⚠️ 快捷方式**禁止在主入口顶层静态 import `Websdk5Adapter`**（会破坏 4.x 下游的摇树隔离），默认构造逻辑放子路径入口（如 `@easemob-community/uikit-im/websdk5`），见主计划决策 22 | 兼容存量业务方，非 breaking |
| `components/user-card/user-card-modal.vue` | 【修改】`UserInfoAttribute` → contract | |
| `modules/chat/message-item/combine-message-modal.vue` | 【修改】`Message` → contract | |
| `modules/chat/message-list/message-list.vue` | 【修改】`GroupMessageReadUsersResult` → contract（中立） | |
| `modules/contact/contact-detail.vue` | 【修改】`UserInfo`/`UserInfoAttribute` → contract | |
| `utils/stream-message.ts` | 【修改】`StreamMessageStatus` → contract 中立 | |
| `package.json` | 【修改】删 `easemob-websdk`；加 `@easemob-community/uikit-sdk-contract`（dep）+ `@easemob-community/uikit-sdk-websdk5`（peer/optional） | |
| `vite.config.ts` | 【修改】删 external/globals `easemob-websdk` 与 `getSdkVersion` | |

### E. 构建/依赖联动

1. **版本注入**：`__EASEMOB_SDK_VERSION__` 由「各 adapter 自己注入」；core/im 的 `vite.config.ts` 删除 `getSdkVersion()`。
2. **UMD 全局名（已核对源码修正）**：SDK 自带全局名 4.x=`WebIM`、5.x=`Easemob`，天然不冲突；**adapter 包自身产物**的 UMD 全局名用合法标识符 `EasemobUIKitSdkWebsdk5` / `EasemobUIKitSdkWebim4`，其构建 `external globals` 按 SDK 原生名声明（`'easemob-websdk': 'WebIM'` 或 `'Easemob'`）。core/im 不再 external SDK。
3. **resolver/auto-imports**：契约包若引入新导出，跑 `pnpm -F <pkg> aux:gen`（遵循 AGENTS.md）；core 的 resolver/auto-imports 生成源（`aux-entries.config.mjs`）若引用了迁走的 SDK 类型导出需同步改。
4. **新包登记**：`packages/uikit-sdk-contract` / `packages/uikit-sdk-websdk5` 加入 `pnpm-workspace.yaml`；demo 与 docs 的 workspace 依赖按需接入；demo 的 vite alias 与 `vue-tsc` 类型解析路径同步更新（demo 类型检查依赖 dist，改公开 API 后需重建，见 AGENTS.md）。
5. **core 隔离门禁扩展**：`packages/uikit-core/scripts/check-engine-isolation.mjs` 增加 `easemob-websdk` 禁用（值 import 与 `import type` 都禁），收口后防回流。
6. **chatroom 不动**：本期 `uikit-chatroom` 保持直连 `easemob-websdk@5.x`（主计划「一、1.3」已列为暂缓项）；core 中立化后 chatroom 经 `adapterConfig.managers` 透传槽注入 ChatManager/ChatRoomManager/UserInfoManager，行为不变。若中立化导致 chatroom 类型报错，属预期内——随 core/im 同一轮 type-check 一并修。

---

## 三、关键映射决策（Phase 1 必须守住）

1. **消息 ID**：中立 `msgServerId`（4.x `id` → msgServerId；5.x `msgServerId`）；`msgLocalId`（5.x `msgLocalId`；4.x `SendMsgResult.localMsgId`）仅本地临时。**沿用现有 UI 字段名，UI 层零改名**。
2. **body 无统一 type 判别字段**：中立 `MessageBody` 是结构型联合（字段名 = 5.x），UI 按 `body.content`/`body.thumbnailUrl` 读取零改动；4.x adapter 用 4.x 的 `body.type` 选择映射、再把字段翻成中立命名（映射表见主计划 8.2： `msg→content`、`thumb→thumbnailUrl`、`length→duration`、`addr→address`、`lat/lng→latitude/longitude`、`customEvent/customExts→event/params`、`time→timestamp`，类型字面量 `txt/img/audio/loc → text/image/voice/location`），且**输出只含中立字段、不透传 4.x 原始字段**（结构守卫会被多余字段误导判）。
3. **回执语义**：中立契约暴露 `markConversationRead` / 群已读拉取；5.x adapter 落到 `clearConversationUnreadMessageCount`+`sendMessageReadReceipts`，4.x adapter 落到发 read/channel 消息 + `getGroupMsgReadUser`（详见计划「九」；**4.x 群聊 channel 消息需 `mid`**，adapter 内部维护每会话最后一条已读消息 ID）。
4. **类型守卫**：从现有 core `sdk/types/message.ts` 的结构型守卫原样迁移（字段名不变），两代共用。
5. **`UiConversation`/`UiContact`/`UiGroup`/`UiPresence`/`UiNoticeMessage`**：已是中立，原样搬入 contract，UI 零改动。
6. **adapter 不反向依赖 uikit-im**：`message-adapter.ts` 当前 import 的 `customEventPreviewMap`（`im/utils/resolve-last-message-text`）迁入 adapter 包前须先解耦——下沉 core 或改为 adapter 构造时注入 preview resolver（与 `ConversationDomain` 注入 `resolveSenderName` 同模式）；同理排查 `sdk/event/*`、`sdk/domain/*` 里所有 `../../` 指向 im 内部的 import。
7. **`UIKitDataSource` 过渡**：`composables/types.ts` 的 `UIKitDataSource` 标记 `@deprecated`，字段薄别名转发到新 repository 接口（`fetchContacts→contact.fetchContacts` 等）；Provider `dataSource` prop 保留至下个大版本，不直接删。

---

## 四、验证门禁（Phase 1 完成标准）

- `pnpm -F @easemob-community/uikit-im exec vue-tsc --noEmit`（0 错误）
- `pnpm -F @easemob-community/uikit-im build`
- `cd apps/demo && pnpm exec vue-tsc --noEmit`
- **5.x 全量回归「行为不变」**（对照 Phase 0 记录的基线，逐项手测：登录/会话/收发各类型消息/联系人/群/回执/撤回/编辑/翻译/置顶/搜索）
- 公开 API 无 breaking（组件 props/emits/composable 签名、`sdk/index.ts` 的 re-export 面不变）
