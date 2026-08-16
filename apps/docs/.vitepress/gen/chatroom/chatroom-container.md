<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomContainer API

### Props

| 属性              | 类型                                       | 默认值         | 说明                                                                                                      |
| --- | --- | --- | --- |
| roomId          | `string`                                 | `''`        | 目标聊天室 ID（变化时自动退出旧房并入新房）；auto-join 关闭时仅渲染外壳                                                              |
| scene           | `string \| Partial<ChatroomSceneConfig>` | `undefined` | 场景预设：内置场景名（live/voice/class）或部分配置（见 useChatroomScene）                                                   |
| autoJoin        | `boolean`                                | `true`      | 是否自动加入（有 roomId 时），默认 true                                                                              |
| historyPageSize | `number`                                 | `50`        | 进房拉取的历史消息条数（默认 50，展示「最近 N 条」提示）                                                                         |
| maxMessages     | `number`                                 | `200`       | 消息渲染列表封顶条数（默认 200，防大直播间刷屏）                                                                              |
| joinExt         | `string`                                 | —           | 加入 UI 房时透传的扩展信息（业务来源标记等；房间内其他成员经 member-joined 事件收到，P4 review 需求 2）                                     |
| signalRooms     | `ChatroomSignalRoomConfig[]`             | —           | 信令房订阅列表（§5.9 多房间：1 个 UI 房 + N 个信令房；数组存在即多房，<br>不引入 isMultiChatroom 布尔）。信令房消息经 signal-message 透传，业务自行呈现。 |

### Events

| 事件名              | 参数                                   | 说明                                                                               |
| --- | --- | --- |
| `back`           | —                                    | 点击顶部返回（业务决定路由/关闭）                                                                |
| `kicked`         | reason: number                       | 当前用户被移出聊天室                                                                       |
| `destroyed`      | —                                    | 聊天室被解散                                                                           |
| `join-error`     | error: unknown                       | 加入聊天室失败（错误已 toast，此事件供业务补充处理）                                                    |
| `member-joined`  | payload: ChatroomMemberJoinedPayload | 成员加入（含 join ext 透传，P4 review 需求 2）：业务可据此识别<br>新成员来源/携带信息做自定义逻辑（如「XX 来自直播间 A」提示）。 |
| `signal-message` | payload: SignalMessagePayload        | 信令房消息透传（§5.9：UIKit 零渲染零假设，payload 为解码后的 UiMessage）                               |
| `signal-status`  | payload: SignalStatusPayload         | 信令房状态变化（joined/failed/kicked/destroyed；失败不拖累 UI 房）                               |

### Slots

| 插槽名                   | 说明 |
| --- | --- |
| `header`              | —  |
| `header-title`        | —  |
| `header-extra`        | —  |
| `toolbar`             | —  |
| `manage-actions`      | —  |
| `stage`               | —  |
| `mic-queue`           | —  |
| `notice`              | —  |
| `message-list`        | —  |
| `message-custom`      | —  |
| `message-item`        | —  |
| `empty`               | —  |
| `terminal`            | —  |
| `gift-bar`            | —  |
| `input-bar`           | —  |
| `member-sidebar`      | —  |
| `member-panel`        | —  |
| `member-item`         | —  |
| `announcement-editor` | —  |
