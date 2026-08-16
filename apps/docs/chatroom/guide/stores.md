# 数据层：stores 与 composables

聊天室的数据层分两层：**stores（Pinia）** 持有状态与原子操作，**composables** 提供
面向业务的能力封装。业务开发**优先使用 composables**（`useChatroom` / `useChatroomMessage` /
`useChatroomMember` / `useChatroomAttributes`），stores 仅在需要直接读取底层状态时使用。

## useChatroomStore（房间注册表）

「1 个 UI 房 + N 个信令房」统一建模：`rooms` 为注册表 `Map<roomId, RoomState>`，
`activeRoomId` 指向 UI 房（单房为其特例）。

```ts
interface ChatroomRoomState {
  kind: 'interact' | 'signal'     // UI 房（完整容器语义）/ 信令房（静默订阅）
  status: ChatroomStatusValue     // idle → joining → joined → leaving → idle
  roomId: string
  info: Chatroom | null           // 房间详情（事件同步）
  members: ChatroomMember[]       // 已加载成员（游标分页）
  memberCursor?: string
  membersHasMore: boolean
  muteList: ChatroomMuteItem[]    // 禁言名单
  isAllMuted: boolean             // 全员禁言中
  announcement: string            // 房间公告
  attributes: ChatroomAttributes  // 房间属性 KV 缓存（四层同步之一）
  joinToken: number               // join 竞态令牌（防陈旧 ACK 撞号）
  pendingRejoin: boolean          // 断线前 joined：连接恢复自动重进
  autoRejoin: boolean
  kickReason?: number             // 被移出房间的 SDK 原因码
}
```

常用只读入口（computed）：`roomId` / `status` / `isJoined` / `info` / `members` /
`roomStatus(roomId)` / `isKnownRoom(roomId)`。

> 直接写 store 会绕过 composable 的竞态处理（join 去重 / 令牌校验），
> 仅调试与高级场景使用。

## useChatroomMessageStore（消息桶）

消息按房间分桶（`Map<roomId, Bucket>`），与注册表一一对应：

```ts
interface ChatroomMessageBucket {
  messages: UiMessage[]          // 渲染列表（已封顶）
  maxMessages: number            // 封顶条数（默认 200，防大直播间刷屏）
  historyLoaded: boolean         // 进房历史已拉取
  loadingHistory: boolean
  historyCursor?: string
  historyHasMore: boolean
  buffer: UiMessage[]            // 接收缓冲队列（增量有序，按帧 flush 合并）
}
```

- 接收侧：消息先进 `buffer`（不进响应式系统），按帧批量 flush 进 `messages`；
- `subscribe` 订阅者拿到的是**增量有序 + 批量**回调（见 [headless](./headless) 契约）；
- 渲染列表 trim 封顶不影响订阅者（headless 不丢消息）。

## composables 一览

| composable | 能力 | 底层 store |
| --- | --- | --- |
| `useChatroom` | 进房 / 退房 / 状态 / 断线重进 / join 竞态 | `useChatroomStore` |
| `useChatroomMessage` | 订阅 / 发送 / 历史 / 限流反馈 | `useChatroomMessageStore` |
| `useChatroomMember` | 成员分页 / 禁言 / 踢人 / 黑名单 / `canManageMember` | `useChatroomStore` |
| `useChatroomAttributes` | 房间属性 KV 四层同步 | `useChatroomStore` |
| `useChatroomMessageUserInfo` | 消息 ext 昵称 / 头像渲染配置 | —（config） |
| `useChatroomScene` | 场景预设注册 / 解析（`themeOverrides` / `i18nOverrides`） | —（纯函数） |
| `useChatroomProvider` | 初始化：pinia / client / 事件装配 / 房间终态回调 | 全部 |

## 稳定性约定

- **composables 是稳定 API**：对外契约（签名 / 事件 / 语义）向后兼容；
- **stores 是内部实现细节**：已公开导出供高级场景直接读取，但结构可能随内核演进调整；
  业务代码若依赖 store 内部字段，请在升级时关注 CHANGELOG。

## 相关文档

- [headless 接入](./headless)（订阅契约与消费形态）
- [双 UIKit 架构](./architecture)（store/composable 分层铁律）
