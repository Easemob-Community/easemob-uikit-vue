# Chatroom 组件插槽与 Props 可控性反向评估（CHATROOM-CAPABILITY-REVIEW）

> 评估日期：2026-08-15。评估对象：`@easemob/uikit-chatroom` 0.2.0（`packages/uikit-chatroom/src`）。
> 方法：消费者视角反向推演——「接入方想做什么 → 当前 API 能否做到 → 卡在哪」，
> 覆盖容器层 / 直播组件集 / 通用消息成员模块 / headless 契约与文档 四层。
> 状态：**评估完成，P6 增强已批准实施**。关联 TECH-DEBT：D101。

## 结论先行

容器插槽哲学（「每个边界开槽，变种优先插槽、其次 config」）执行得相当彻底——16 个命名插槽、
7 个 emits、headless 一等公民契约都成立；**但存在三个与「好用」直接相关的硬缺口**：

1. **无「隐藏内置 header」开关**：`#header` 插槽可整条重写，但没有 `features.header` 之类的
   隐藏选项（uikit-im 系容器 `Contact/Conversation/AddressBook` 均有 `showHeader` prop 惯例，
   chatroom 容器缺失）。**demo 五页全部「DemoSceneHeader + 容器内置 ChatroomHeader」双层
   header 重合，正是接入方自绘导航头时的真实卡点。**
2. **弹幕流 `ChatroomLiveDanmakuStream` 零插槽**：私域直播弹幕场景无法在用户名旁插入
   VIP 徽章/等级/勋章（`isVip` 布尔只影响内置 welcome 皇冠高亮），无法整条自定义单条弹幕；
   `LiveDanmakuItem.kind` 是封闭联合类型，业务自定义消息语义进不了类型系统，分区常量
   `NOTIFICATION_KINDS`/`CHAT_KINDS` 封闭导致自定义 kind 无法指定进通知区还是聊天区。
3. **容器消息区不可整体替换**：无 `message-list` 插槽——「容器 + 弹幕/轨道渲染」组合缺失，
   live 场景只能整页走 headless；被踢/解散终态视图、公告编辑弹窗同样不可插槽覆盖。

次要缺口：`ChatroomLiveTopBar` 零插槽（无法注入分享/关注/在线数）；docs 的
`chatroom-container.md` 仍是「规划中」占位页（插槽只列 11 个，实际 16 个）。

## 一、容器 `EmChatroomContainer` API 全量清单（已核实）

### props（`containers/chatroom-container/types.ts`）

| prop | 默认 | 说明 |
|---|---|---|
| `roomId` | `''` | 目标聊天室 ID，变化自动换房 |
| `scene` | — | 场景预设：`'live'/'voice'/'class'` 字符串或 `Partial<ChatroomSceneConfig>` |
| `autoJoin` | `true` | 有 roomId 时自动加入 |
| `historyPageSize` | `50` | 进房拉取历史条数 |
| `maxMessages` | `200` | 渲染列表封顶条数 |
| `joinExt` | — | 加入 UI 房透传扩展信息（成员经 `member-joined` 收到） |
| `signalRooms` | — | 信令房订阅列表（数组存在即多房，无布尔开关） |

### emits

`back` / `kicked(reason)` / `destroyed` / `join-error(error)` / `member-joined(payload)` /
`signal-message(payload)` / `signal-status(payload)`——全部 kebab-case，符合仓库规范。

### 命名插槽（16 个）

| 插槽 | scope | 覆盖粒度 |
|---|---|---|
| `header` | `{ status, room-info, on-exit }` | 整条（默认内置 `ChatroomHeader`） |
| `header-title` | `{ room-info }` | 标题区 |
| `header-extra` | `{ room-info }` | 右侧扩展区 |
| `toolbar` | `{ status }` | header 与消息区之间的业务工具条 |
| `manage-actions` | `{ can-manage, is-owner, current-role }` | 管理位操作条（canManage 门控） |
| `stage` | `{ status, room-info }` | split 舞台区（视频/白板/商品区） |
| `mic-queue` | — | 麦位栏 |
| `notice` | `{ content }` | 公告条 |
| `message-item` | `{ message }` | 单条消息渲染 |
| `message-custom` | `{ message }` | custom 消息优先渲染 |
| `empty` | `{ status }` | 消息区空态 |
| `gift-bar` | `{ disabled }` | 礼物栏 |
| `input-bar` | `{ disabled }` | 输入条 |
| `member-panel` | `{ show, on-close }` | 成员面板整层 |
| `member-item` | 透传 | 成员列表项 |
| `member-sidebar` | — | PC 常驻成员侧栏 |

### 不可插槽覆盖（缺口）

- **被踢/解散终态视图**：固定文案 + 退出按钮，无插槽；
- **公告编辑弹窗**：固定 EmPopup + textarea + 保存按钮，无插槽；
- **消息列表整体**：加载更多 + VirtualList + 空态整块不可替换（只能逐条 `message-item`）。

## 二、直播组件集 API 清单（已核实）

| 组件 | props | 插槽 | 评估 |
|---|---|---|---|
| `ChatroomLiveDanmakuStream` | `maskName`/`maxChatItems`/`maxNoticeItems`/`shape`/`maxLines`/`size` + 全套 `--live-danmaku-*` CSS token | **无** | **缺口**：VIP 徽章/整条自定义/空态均不可插槽化；kind 封闭；分区封闭 |
| `ChatroomLiveInputBar` | `placeholder`/`disabled`/`disabledHint`/`quickPhrases`/`showQuickPhrases`/`maxLength`/`sendIntervalMs`/`sendTooFastHint`/`blockWords`/`blockHint`/`beforeSend`/`optimistic` | `#quick-phrases`/`#actions`/`#panels` | ✅ 完整 |
| `ChatroomLiveTopBar` | `title`/`avatarUrl`/`heat`；emits `more`/`report` | **无** | **缺口**：无法注入分享/关注/在线数 |
| `ChatroomLiveInteractiveCard` | `active`/`soldOut`/`closable`/`soldOutText`/`autoCloseMs`/`countdownFormat`；emits `click`/`close`/`action` | `#title`/`#default`/`#footer` | ✅ 完整 |
| `ChatroomLiveOverlayManager` | `items`；emits `remove` | `#item`（`{ item, close }`） | ✅ 完整 |
| `ChatroomLiveFullscreenEffect` | `items`；emits `end` | `#default`（`{ item, end }`） | ✅ 完整 |
| `ChatroomLiveWelcomeBanner` | `show`/`name`/`isVip`；emits `hidden` | 无 | 单条横幅场景收益低，**不做** |

弹幕类型契约（`live-danmaku-types.ts`）：`LiveDanmakuKind` 封闭联合
（`'normal'|'checkin'|'purchase'|'gift'|'welcome'`）；`LiveDanmakuItem`
（`id/kind/name/content/count/giftIcon/isVip`）；分区常量 `NOTIFICATION_KINDS`
（checkin/purchase/welcome 固定上部通知区）与 `CHAT_KINDS`（normal/gift 滚动聊天区）。

## 三、通用消息/成员模块

- `ChatroomMessageItem`：无插槽；容器 `#message-item` 整条替换已覆盖极端诉求；ext 昵称/头像
  下沉已有 `setChatroomMessageUserInfoConfig`（`config/message-user-info.ts`）。**细粒度徽章
  插槽不做**（防插槽膨胀，文档说明整条替换用法）。
- `ChatroomMemberItem`：`#manage-actions` hover 插槽（PC）+ 内置角色徽章；自定义徽章经容器
  `#member-item` 整条覆盖。**不做细粒度 badge 插槽**。
- `ChatroomMemberPanel`：容器可整体覆盖 + 透传 `#member-item`——✅ 完整。

## 四、headless 契约与文档

- headless（设计文档 §5.10）：`useChatroom`/`useChatroomMessage.subscribe`（增量有序 +
  批量消费 + 可丢弃中间帧）/`useChatroomMember`/`useChatroomAttributes` 与容器同内核——
  ✅ 完整。
- 文档缺口：`apps/docs/chatroom/components/chatroom-container.md` 为「规划中」占位页
  （插槽列 11 个 < 实际 16 个，props/emits 未文档化）；live 组件集无组件文档页；
  demo 无 header 隐藏/重写、弹幕自定义插槽示范。

## 五、缺口矩阵与决策（P6 增强，全部向后兼容）

| # | 缺口 | 决策 | 方案 |
|---|---|---|---|
| P6-1 | 无隐藏 header 开关 | **做** | scene `features.header?: boolean`（缺省 true）；`header: false` 隐藏内置，`#header` 插槽提供时仍渲染（容器内接管）；两者都无 = 无 header 区 |
| P6-2 | 弹幕流零插槽 / kind 封闭 / 分区封闭 | **做** | `#prefix`（`{ item, display-name }`，整条气泡最左端——左侧头像/等级/VIP 皇冠直插位）/`#badge`（`{ item, display-name }`，用户名后）/`#item`（`{ item, display-name, display-count }`，整条覆盖）/`#empty`；`LiveDanmakuKind` 加宽 `\| (string & {})`；`LiveDanmakuItem` 增 `zone?: 'notice'\|'chat'` 与 `meta?: Record<string, unknown>`；`isNotificationKind`/`isChatKind` 参数加宽 `string` |
| P6-3 | TopBar 零插槽 | **做** | `#extra` 插槽（more/report 之后） |
| P6-4 | 容器消息区/终态/公告编辑不可替换 | **做** | `#message-list`（`{ messages, status, historyHasMore, loadingHistory, loadMore }`，替换加载更多+VirtualList+空态整块）/`#terminal`（`{ status, kicked, destroyed, on-exit }`）/`#announcement-editor`（`{ show, content, save, close }`） |
| P6-5 | 消息项/成员项细粒度徽章 | **不做** | 容器整条替换已覆盖；文档说明 |
| P6-6 | 文档占位页过期、demo 双层 header、无插槽示范 | **做** | container 页重写 + 新增弹幕流组件页 + demo 改造（见下） |

### 语义约定（定死，防歧义）

- `features.header` 只控制**内置** `ChatroomHeader`；`#header` 插槽优先级最高（提供即接管）。
  组合：内置（默认）/ 插槽重写（`#header`）/ 容器内接管（`header: false` + `#header`）/
  完全无头（`header: false`，自绘放容器外）。
- `#message-list` 提供后，容器不再渲染 VirtualList/空态/加载更多，滚动跟随与加载职责转移
  给业务；`#message-item`/`#message-custom`/`#empty` 在提供 `#message-list` 时自然失效。
- 自定义 kind 默认兜底：按 `zone`（缺省回落 chat 区）落入对应区，kind class 透传
  （无样式回落默认气泡）；自定义 kind 建议配合 `#item` 插槽。

### Demo 改造

- basic / voice / class 三页：`features: { header: false }`（容器外保留 DemoSceneHeader），
  直接消除双层 header 重合并示范接管形态；pc-live / pc-class 保留 `#header-extra`（示范局部覆盖）。
- live 页：弹幕流新增 `#badge`（VIP 徽章，读 `item.meta`）与 `#item`（整条自定义）演示开关。
- basic 页示范 `#message-list`（容器内弹幕列表形态）。

## 六、验收口径

- 一行 `:scene="{ name: 'live', features: { header: false } }"` 关掉内置 header；
  `#header` 插槽完全重写；demo 页双层 header 消失；
- 弹幕流不动内核：`#badge` 插入 VIP 徽章、`#item` 整条自定义、自定义 kind + `zone`/`meta`
  透传，合并计数/挤出/进出场动画照常；
- 容器 `#message-list` 可整体替换消息区（fullscreen 与 split 两分支同步）；
- docs 插槽清单与实现一致；门禁全绿（chatroom vue-tsc + build + demo-chatroom vue-tsc +
  changelog:check + 涉及文件 lint）；现有 API 零破坏（新增项全部可选）。

## 七、明确不做（防膨胀）

- `ChatroomMessageItem` / `ChatroomMemberItem` 细粒度徽章插槽（整条替换已覆盖）；
- `ChatroomHeader` 细粒度按钮开关 prop（返回/退出/人数，`#header` 整条覆盖）；
- 内置 live 顶部栏进容器（保持「容器=通用壳、直播 overlay=headless 自绘」哲学）；
- `ChatroomLiveWelcomeBanner` 插槽化。
