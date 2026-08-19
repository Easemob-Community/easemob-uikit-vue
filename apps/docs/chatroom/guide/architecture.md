# 双 UIKit 架构

环信 UIKit 采用「共享基座 + 双场景包」的架构：**单群聊**与**聊天室**是两个并列的场景包，
各自独立构建、独立发布，共享同一基座，避免互相绑架：

| 包 | 场景 | 职责 |
| --- | --- | --- |
| `@easemob/uikit-core` | 共享基座 | sdk 抽象层、主题、i18n、常量、原子组件、Provider 生命周期 |
| `@easemob/uikit-im` | 单群聊 | 会话 / 通讯录 / 群组 / 聊天场景层（现有文档） |
| `@easemob/uikit-chatroom` | 聊天室 | 房间 / 消息流 / 成员 / 禁言 / 公告 / 房间属性 + 场景预设 |

## 为什么拆成两个包

聊天室（直播间、语聊房、小班课）与单群聊的语义几乎不重合：聊天室**无离线消息、无未读 /
回执、无会话列表**，消息是广播流；单群聊围绕会话 / 联系人 / 群组 / 回执体系构建。两者极少被
同一接入方同时需要——拆包让聊天室 H5 页面不必加载 tiptap、通讯录、群组代码，发布会互不绑架。

## 共享什么、不共享什么

- **共享**（进 `@easemob/uikit-core`）：client / ManagerHost 抽象、连接级事件、notification
  引擎、user-info / presence domain、主题与 i18n、常量与工具、通用原子组件、`EmUIKitProvider`
  生命周期、domain 无关的 H5 composables。
- **不共享**（各自场景包内）：单群聊的会话 / 通讯录 / 群组 / 消息 store 与模块；聊天室的房间
  状态机、广播消息流、成员管理、禁言、公告、房间属性与场景预设。

## 聊天室包内部架构

```
@easemob/uikit-chatroom
├── sdk/          domain（Chatroom/Member/MuteItem/Announcement/Attributes）
│                 adapter（ChatroomAdapter / normalizeUserId / toChatroomUiMessage）
│                 event（registerChatroomEventHandlers，按 manager + chatType 过滤互不污染）
├── store/        房间注册表 Map<roomId, RoomState> + activeRoomId（单房为特例）；
│                 消息桶按 roomId 分桶（多房 / 信令房零返工）
├── composables/  useChatroom / useChatroomMessage / useChatroomMember /
│                 useChatroomAttributes / useChatroomMessageUserInfo / useChatroomScene /
│                 useChatroomLayout / useChatroomPopupMode / useChatroomProvider
├── containers/   EmChatroomContainer（P2-2 外壳：进出房 / 历史 / 消息 / 成员 / 通知 / 19 插槽）
└── modules/      common（header/input-bar/member-panel/notice/message-item）
                  live（danmaku-stream/top-bar/input-bar/gift-bar/overlay 组件集）
                  voice（mic-queue）· pc（split-layout/member-sidebar/context-menu）
```

**分层铁律**：store / composable 层零组件 import，容器只消费公开 composable 契约
（headless 与容器同内核，不存在「第二 API 面」）。

## 场景预设系统

变种 = **纯配置 + 插槽覆盖**，不 fork 代码：

1. 内置预设（`LIVE_ROOM_SCENE` / `VOICE_ROOM_SCENE` / `CLASS_ROOM_SCENE`）模块加载即注册；
2. `scene` prop 传预设名或部分配置对象（与预设合并）：`features`（gift / micQueue /
   memberList / announcement / header / messageArea / management / multilineInput /
   keyboard）、`layout`（fullscreen / split / auto）、`popupMode`、`panels`、
   `themeOverrides`（CSS 变量覆盖）、`i18nOverrides`（文案合并）；
3. 每个 UI 边界开槽（容器 19 个命名插槽），插槽优先于 config。

## headless 契约（一等公民）

弹幕轨道 / 飘屏 / 礼物特效是强差异化 UI，业务可**不渲染容器**，直接消费数据能力：

- `useChatroom`：进房 / 退房 / 状态 / 断线自动重进 / join 竞态处理；
- `useChatroomMessage`：`subscribe` **增量有序 + flush 批量消费**（无消费者不丢消息，
  丢帧由业务决定）+ 按 `roomId` 发送（节流按房间独立）；
- 系统通知全部事件化出口；发送限流反馈程序化（无输入框）。

## 多房间订阅（信令房）

私域直播「1 个 UI 房 + N 个信令房」：`signalRooms` 数组即多房（无布尔开关），
信令房消息零渲染零假设、经 `signal-message` 事件透传；join 失败 / 被踢 / 解散降级
`signal-status` 回调，**不拖累 UI 房**；跨房消息无全序，业务不得按全序消费。

## 双文档切换

本站通过顶部标题旁的切换器在「单群聊 UIKit」与「聊天室 UIKit」两套文档之间切换：
`/` 前缀为单群聊文档（既有），`/chatroom/` 前缀为聊天室文档（本套）。

## 设计文档

完整设计决策（三包边界、聊天室包内部设计、场景预设系统、分阶段计划）见仓库根目录
[CHATROOM-UIKIT-DESIGN.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/docs/CHATROOM-UIKIT-DESIGN.md)。
