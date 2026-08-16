# 聊天室 UIKit（`@easemob/uikit-chatroom`）设计规划

> 状态：**设计已评审、待实施**（2026-08-15 落盘）。按用户时序，`@easemob/uikit` 1.x 开发完成后启动实施。
> 评审记录：一轮评审 → 「复审修正记录」6 条（见第六节）；二轮评审补强（同日）——P1 迁移判定清单前置、core 版本纪律、`extendLocale` 复杂度重估、接收侧渲染节流与发送侧限流分层、大房间成员分页、发送节流 UI 反馈、CHANGELOG 双版本工具前移至 P2（均已并入正文）；三轮决策（同日）——**`@easemob/uikit` 改名为 `@easemob/uikit-im`**（已核实 npm 公网 registry 无此包，从未发布，改名窗口在正式发布前；三包命名 `uikit-core` / `uikit-im` / `uikit-chatroom`），新增 P0.5 纯改名阶段。
> 对应 TECH-DEBT [D97](#d97)。
> 范围：架构决策、三包边界、聊天室包内部设计、场景预设系统、H5 要点、构建/版本规则、P0→P5 分阶段计划。
> 本文档只做决策沉淀，不含实施代码；实施时以当时 `easemob-websdk` 实际 API 为准复核（见「明确假设」）。

---

## 一、背景与结论

环信 IM 的**聊天室（Chatroom）**与单聊/群聊场景几乎不重合：聊天室典型场景为中大型直播间、语聊房、小班课、私域直播/带货直播（H5 居多），无离线消息、无未读/回执、无会话列表概念，消息是广播流；而单群聊 UIKIT 围绕会话/联系人/群组/回执体系构建。两者**极少同时被同一接入方需要**。

**核心结论**：不在 `@easemob/uikit` 内追加聊天室功能，也不复制一套共享代码，而是抽取共享基座 `@easemob/uikit-core`，聊天室作为独立场景包 `@easemob/uikit-chatroom` 与单群聊包并列。**现有单群聊包趁正式发布前改名为 `@easemob/uikit-im`**（已核实 npm registry 从未发布，改名零外部成本；正式发布后此窗口永久关闭）：

```
packages/
  uikit-core/       ← 共享内核：sdk 抽象层、主题、i18n、常量、工具、原子组件、Provider 生命周期
  uikit-im/         ← 现有 packages/uikit 改名 + 瘦身：core + 会话/通讯录/群组/聊天 场景层
  uikit-chatroom/   ← 新增：core + 聊天室场景层（房间/消息/成员/禁言/公告/房间属性 + 场景预设）
```

命名原则：包名表达**场景**而非层级——`core` 是基座，`im`（单群聊）与 `chatroom` 是两个并列场景包；不采用 `uikit-base` 这类与 core 语义撞车的名字。

变种（语聊房、私域直播、带货直播、小班课）**不做成独立包、不 fork 代码**，通过「场景预设 config + 容器插槽」在聊天室包内实现，用户靠配置和插槽变种，H5 优先。

## 二、现状盘点（已核实事实，2026-08-15）

- 单仓 pnpm workspace：`packages/*`（uikit、mcp）+ `apps/*`（demo、docs）+ `integrations/skills`；`pnpm-workspace.yaml` 的 `packages/*` 通配已覆盖新包，无需改 workspace 配置。
- `@easemob/uikit` v1.9.0，分层：`components/`（原子）、`modules/`（业务块）、`containers/`（页面容器）、`store/`（Pinia）、`composables/`、`sdk/`（client + domain + adapter + event 注册表 + notification）、`theme/`（CSS 变量 539 行）、`locale/`（zh-CN/en 各 527 行）、`constants/`。
- sdk 层已是干净的 `ManagerHost` 抽象（chatManager/contactManager/groupManager/presenceManager/pushManager/userInfoManager），事件注册表按 manager 挂 handler（`sdk/event/registry.ts`），**但该注册表硬编码了单群聊场景的全部 handler 与 stores**（见「复审修正 1」）。
- **当前包内没有任何聊天室实现**（仅 `error.chatroom*` 错误文案）。
- 底层 `easemob-websdk@5.0.0` 自带完整 `ChatRoomManager`：`joinChatRoom`/`leaveChatRoom`、`getMemberList`/`removeMembers`、`getAdminList`/`addAdmin`/`removeAdmin`、`getMuteList`/`muteMembers`/`unmuteMembers`/`muteAllMembers`/`unmuteAllMembers`/`checkIfInMuteList`、`getBlocklist`/`blockMembers`/`unblockMembers`、`getAllowlist`/`addUsersToAllowlist`/`removeUsersFromAllowlist`/`checkIfInAllowList`、`getAnnouncement`/`updateAnnouncement`、**`getAttributes`/`setAttributes`/`removeAttributes`（房间自定义 KV 属性）**、`getChatRoomList`/`getChatRoom`/`getChatRoomInfo`/`updateChatRoomInfo`。`ChatManager` 覆盖全部消息类型（含 custom 消息，礼物可走 custom）+ `getHistoryMessages`（聊天室历史）+ 撤回 + reaction。**能力底座齐备，不需要等 SDK**。
- **ChatClient 是 manager 注册制**：`UIKitClient` 初始化 `SdkChatClient.init({ managers: [ChatManager, ContactManager, GroupManager, PresenceManager, PushManager, UserInfoManager] })`，**未注册 ChatRoomManager**（见「复审修正 2」）。
- 聊天室事件面：`CHATROOM_NOTIFY`（成员进出/禁言/管理员变更/公告变更/解散等）；`types/chatroom.d.ts` 存在 `ATTRIBUTES_UPDATE`/`ATTRIBUTES_REMOVED`/`ATTRIBUTES_CHANGED` 等属性变更事件类型（见「复审修正 5」）。
- 仓库硬约束：验证门禁 = `vue-tsc --noEmit` + `build` + demo 类型检查；版本号与根 CHANGELOG 单一数据源（`pnpm changelog:check` → `scripts/check-version-sync.mjs`）；`Em` 前缀 + kebab-case 事件；Avatar 走主题；枚举字符串走 `constants/`；协作中文。

## 三、决策分析：为什么是「独立包 + 抽 core」

| 方案 | 优点 | 致命问题 |
|---|---|---|
| A. 同一包加 chatroom | 零抽取成本 | ① 单包是单 rollup bundle，聊天室 H5 页面被迫加载 tiptap、通讯录、群组代码；② 聊天室无会话列表/未读/回执/离线消息，与单群聊消息模型完全相反，全包到处要 `if (chatroom)`；③ 发布会互相绑架；④ API/文档/Resolver/MCP 面混在一起 |
| B. 独立包、复制共享代码 | 隔离彻底 | 主题/i18n/sdk 抽象/原子组件双份维护 → 必然漂移（本仓库已有 Avatar 走主题、枚举统一等强约束，复制即违约） |
| **C. 独立包 + `@easemob/uikit-core`（推荐）** | 场景隔离 + 基座单一维护；单群聊包组件/composable 对外签名零变化（仅包名随 P0.5 改为 `uikit-im`）；聊天室 H5 bundle 不含 1v1 场景代码 | 需要一次纯改名（P0.5）+ 一次机械性抽核重构（见 P1，风险可控，逐层迁移 + 每步门禁） |

**原则：按场景分包、按基座共享。** 包按场景分，**不按子场景分**——不做 `uikit-live`/`uikit-voice` 子包；若未来某个变种被证明有独立复用的需求再拆。

## 四、三包职责边界

### 4.1 共享边界（进 core，两场景包共用）

- `sdk/` 层：client/`ManagerHost` 抽象、连接级事件（client store、token 过期、断线重连）、notification 引擎、notice 工具（`insertChatNotice`/`createNoticeMessage` 等）、domain 基础模型（user-info、presence 是共用的）
- `theme/`（CSS 变量体系 + 暗色）、`locale/`、`constants/`、`utils/`
- 原子组件：Avatar、Icon、IconButton、Button、Input、Modal、Popup、Toast、ActionSheet、Badge、Empty、ImageViewer、CopyableText、ScrollToTop、StatusBanner、Notification、Cell 系列、PresenceAvatar 等（**判定原则：只依赖通用能力（client/user-info/presence/theme/locale）的进 core；依赖会话/通讯录/群组 domain 的留在 uikit-im**，如 GroupCard 留 uikit-im，UserCard 视其依赖而定，P1 逐组件判定）
- Provider 生命周期：`EmUIKitProvider`（client 初始化/token/features/theme）移入 core，uikit-im re-export 保持对外签名不变
- 共享 composables：`useClient`、`useTheme`、`useUserInfo`/`useOwnUserInfo`、`usePresence`、`useNotification`、`useToast`、H5 通用工具（`useH5Adaptation`、`useKeyboard`、`useLongPress`、`usePullRefresh`、`useViewport`、`useBottomSheet`、`useRipple` 等 domain 无关项）

### 4.2 不共享的边界（共享基座，不共享场景状态）

- **单群聊包独有**：conversation/contact/group/message store 与 modules、会话/通讯录/群组/聊天容器、tiptap 编辑器、已读回执/置顶/合并转发/消息搜索等交互、`registerEventHandlers`（对外签名不变）
- **聊天室包独有**：chatroom store（房间状态 + 广播消息流）、成员管理、禁言/黑名单/白名单、公告、房间属性、礼物、麦位等

> **边界判定的执行层**：本节与 §4.1 是静态边界清单；后续「新功能进 core 还是场景包」的
> 实时判定流程（决策树 / locale 与 constants 特例 / 进 core 自检清单 / 硬规则）以 skill
> `uikit-package-boundary` 为准，core 隔离由 `packages/uikit-core/scripts/check-core-isolation.mjs`
> 门禁（core build 前置）强制（TECH-DEBT D99）。

## 五、聊天室包内部设计

### 5.1 目录结构（镜像现有分层，降低心智成本）

```
packages/uikit-chatroom/
  src/
    sdk/
      domain/chatroom-domain.ts      # Chatroom / ChatroomMember / MuteItem / Announcement / RoomAttribute 类型
      adapter/chatroom-adapter.ts    # 封装 ChatRoomManager + ChatManager 的聊天室方法
      event/chatroom-events.ts       # CHATROOM_NOTIFY + chat 事件 → 类型化事件（注册到 chatRoomManager）
    store/
      chatroom.ts                    # 当前房间：join/leave 状态、成员/管理员/禁言名单、公告、属性
      chatroom-message.ts            # 广播消息流：历史 + 增量，无未读/无会话概念
    composables/
      useChatroom()                  # 房间生命周期 join/leave/断线重进
      useChatroomMessage()           # 收发渲染管线（含历史拉取与列表封顶）
      useChatroomMember()            # 成员列表/禁言/踢人/管理员操作（按角色权限位）
      useChatroomAttributes()        # 房间属性 KV 响应式封装（变种卖点，见 5.6）
      useChatroomScene()             # 场景预设加载器
    containers/chatroom-container/   # EmChatroomContainer：房间外壳 + 全部命名插槽
    modules/chatroom/                # 消息项、成员项、系统通知条、禁言条等业务块
    scene/                           # 内置场景预设（live / voice / class / custom）
    components/                      # 聊天室专属原子：GiftBar、MicQueue、MemberPanel…
    index.ts / resolver / auto-imports / theme 扩展 / locale 扩展
```

### 5.2 SDK 层：domain / adapter / event

- **domain**：`Chatroom`（id/名称/描述/最大人数/当前人数/创建者/owner）、`ChatroomMember`（userId/角色 role：owner|admin|member/是否禁言）、`ChatroomMuteItem`、`ChatroomAnnouncement`、`ChatroomAttributes`（KV 映射）。
- **adapter**：薄封装 `ChatRoomManager` 全部能力 + `ChatManager` 的聊天室消息收发/历史（`getHistoryMessages`），返回 domain 类型；错误码映射复用 core `utils/sdk-error.ts` 既有 `error.chatroom*` 文案。
- **event**：`registerChatroomEventHandlers`（chatroom 包自建，不塞进 core 的注册表）：注册到 `chatRoomManager`（CHATROOM_NOTIFY 各子类型）+ `chatManager`（消息按 `chatType === 'chatroom'` 过滤，避免与单群聊事件互相污染）。

### 5.3 store / composables

- `chatroom.ts`：当前房间状态机（idle → joining → joined → leaving → kicked/destroyed），成员/管理员/禁言名单、公告、属性缓存；房间切换的 join 竞态处理（房间 A 的响应晚于房间 B 的 join 时丢弃）。
- `chatroom-message.ts`：广播消息流 —— 进房 `getHistoryMessages` 拉最近 N 条 + 增量追加，**无未读/无会话/无回执语义**；渲染列表封顶（如保留最近 200 条）+ 批量合并，防大直播间刷屏。**接收侧渲染节流是聊天室包自己的职责**（与 SDK 发送侧限流是两回事）：增量消息先入缓冲队列，按帧（rAF / 固定 100~200ms 窗口）批量 append，渲染频率与消息到达速度解耦；大直播间消息洪峰时宁可丢弃/合并中间帧，也不可让 DOM 更新成为瓶颈。
- composables 见目录结构；`useChatroom` 内置「连接恢复后自动重进房间」策略（SDK 自动重连连接，但聊天室需重新 join）。

### 5.4 `EmChatroomContainer` 接入 API（对外公开契约草稿）

```vue
<EmUIKitProvider :app-key="appKey" h5>
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</EmUIKitProvider>
```

- 复用 core 的 `EmUIKitProvider`（只负责 client/主题/i18n），**不新增 Provider 概念**；join/leave 由容器驱动。
- 导出：`EmChatroomContainer` + composables + 场景预设常量 + 类型；全部 `Em` 前缀、事件 kebab-case，与现有规范一致。
- 命名插槽清单（每个边界都开槽；现状 19 个，见根 `CHATROOM-CAPABILITY-REVIEW.md` 一/五节）：
  `header` / `header-title` / `header-extra` / `toolbar` / `manage-actions` / `stage` /
  `mic-queue` / `notice` / `message-item` / `message-custom` / `message-list`（整块替换消息流）/
  `empty` / `gift-bar` / `input-bar` / `member-panel` / `member-item` / `member-sidebar` /
  `terminal`（被踢/解散终态）/ `announcement-editor`（公告编辑弹窗）。
  另：`features.header?: boolean`（缺省 true）控制内置顶部栏显隐——`header: false` 隐藏内置，
  `#header` 插槽提供时仍渲染（容器内接管），完全无头时业务自绘头部放容器外（P6-1）。
- 权限模型：owner / admin / member 三级，控制禁言、踢人、全员禁言、公告编辑、黑/白名单的 UI 显隐（ChatRoomManager 全部具备）。

### 5.5 场景预设系统（「方便用户变种」的核心机制）

场景 = **纯配置 + 插槽覆盖**，不是独立代码库：

```ts
interface ChatroomSceneConfig {
  name: 'live' | 'voice' | 'class' | 'custom'
  layout: 'fullscreen' | 'split'
  features: {
    gift?: boolean        // 礼物栏/礼物消息渲染
    micQueue?: boolean    // 麦位管理（语聊房）
    memberList?: 'panel' | 'popup' | 'none'
    announcement?: boolean
    muteAll?: boolean     // 全员禁言入口
    messageFilter?: (msg) => boolean  // 如语聊房过滤图片消息
  }
  themeOverrides?: Record<string, string>  // CSS 变量覆盖
  i18nOverrides?: Record<string, string>
}
export const LIVE_ROOM_SCENE / VOICE_ROOM_SCENE / CLASS_ROOM_SCENE
```

- `EmChatroomContainer` 读取 config 条件渲染内置块，每个边界开命名插槽；变种时**优先插槽、其次 config、最后才考虑 fork**。
- 与现有 `useChatPlugin` 扩展点哲学保持一致；直播间动态业务（商品卡片、挂件、直播状态条）由接入方用插槽或自定义消息渲染器注入。
- **未识别 custom 消息必须有兜底渲染**，变种没装也能看。

### 5.6 房间属性 attributes（变种隐藏卖点）

`getAttributes`/`setAttributes` 是现成 KV 存储：直播中状态、当前商品 ID、背景图、公告位、麦位状态都可放这里，**变种无需自建服务端**即可同步房间级状态。SDK 存在属性变更事件（`ATTRIBUTES_UPDATE`/`ATTRIBUTES_REMOVED` 等，见 `types/chatroom.d.ts`）。`useChatroomAttributes()` 设计为四层同步：

1. 本地响应式缓存（读写即时生效）；
2. `setAttributes` 推送服务端；
3. 实时变更事件同步（确切事件名/payload 以实施时 SDK 实际 API 为准）；
4. 全量拉取兜底（进房时/事件丢失后 `getAttributes`）。

变种之间共用 KV 命名空间 → **属性 key 加场景前缀**（如 `live:productId`、`voice:micQueue`），防冲突。

### 5.7 消息管线差异（聊天室 vs 单群聊，按差异设计）

| 维度 | 单群聊包 | 聊天室包 |
|---|---|---|
| 消息语义 | 会话/未读/回执/离线 | 广播，无离线、无未读、无回执 |
| 历史 | 本地 + 分页 | 进房必须 `getHistoryMessages` 拉最近 N 条 |
| 渲染 | 气泡 + 回执状态 | 简化气泡 + 系统通知流（复用 core `insertChatNotice`/`createNoticeMessage`） |
| 列表 | 虚拟滚动/长列表 | 封顶渲染（如保留最近 200 条）+ 批量合并，防大直播间刷屏 |
| 房间事件 | — | CHATROOM_NOTIFY：成员进出/禁言/管理员变更/公告变更/解散 → 全部转系统通知插入消息流 |
| 消息类型 | 全量 | 文本/图片/custom（礼物、业务卡片）；**未识别 custom 消息兜底渲染** |
| 撤回 | 完整链路 | 支持但 UI 从简（广播场景撤回仅提示） |

### 5.8 H5 优先（目标场景以 H5 为主）

- 移动端优先布局：全屏房间、安全区 `env(safe-area-inset-*)`、输入条随键盘、底部 Popup 面板（成员列表/礼物面板）、长按菜单适配、礼物连击手势。
- 首屏 bundle 控制：chatroom 包独立打包、core 设为 external；**不引入 tiptap**（聊天室输入条先做 文本+表情+图片+语音转文字）；通讯录/群组代码完全不进包。
- 复用仓库 `uikit-h5-adaptation` skill 沉淀的模式（键盘/安全区/下拉刷新/长按/viewport）。

### 5.9 多房间订阅：UI 房 + 信令房（私域直播双聊天室/多聊天室架构）

> **需求背景**：私域直播为保障消息到达率，常采用**双聊天室/多聊天室**架构——一个**互动直播间**承载弹幕/礼物等高频消息（上屏展示、可容忍偶发丢失），一个或多个**信令直播间**承载商品链接、上下架、连麦指令等低量高可达消息（必须可靠送达，通常不上屏、由业务层自行呈现）。2026-08-15 补充评审确认：**SDK 层已支持多房并行**（`joinChatRoom({ chatRoomId, ext, leaveOtherRooms })` 已核实，并行 join 需显式 `leaveOtherRooms: false`，服务端多房并发上限以实施时实测为准）；卡点在 UIKit 模型，按「**1 个 UI 房 + N 个信令房**」建模——多聊天室是它的一般形式，单房是 N=0 特例。

- **角色语义**：
  - **UI 房（interact）**：完整容器语义——消息流上屏、成员/禁言/公告/属性/礼物、输入条发送目标、场景预设全部生效；
  - **信令房（signal）**：**静默订阅**——不上屏、不落消息桶、不参与任何 UI 状态（成员面板/禁言/公告一律只对 UI 房开放）；消息**透传回调**给业务层（UIKit 零渲染、零假设，连「未识别 custom 消息兜底渲染」都不做）；发送由业务显式指定 roomId。
- **接入 API（草案）**：主房保持**显式单数 prop**（现有插槽体系零改动），信令房用数组表达，**不引入 `isMultiChatroom` 布尔开关**（数组存在即多房，消除「布尔 + 数组不一致」的非法状态）：

```vue
<EmChatroomContainer
  room-id="room_interact"
  :signal-rooms="[{ roomId: 'room_signal', pullHistory: false, autoRejoin: true }]"
  @signal-message="onSignalMessage"   <!-- payload: { roomId, message } -->
/>
```

  - **发送路由**：容器输入条默认发 UI 房；`useChatroomMessage().sendText(text, { roomId })` 显式指定信令房（商品链接/指令走这里）；**发送节流按房间独立统计**（信令房消息量小通常不触发）。
  - **上屏策略**：UI 房消息走 5.7 全量管线（含未识别 custom 兜底）；信令房消息**只透传不出屏**，上屏与否完全由业务层经 `signal-message` 回调决定。
  - scene config（5.5）增加 `signalRooms` 段，带货直播等 preset 默认开双房模板，业务可覆盖（符合「变种靠配置 + 插槽」哲学，不 fork）。
- **store 建模（影响 P2 节奏，关键）**：`chatroom.ts` 按**两层**写，而不是单房间状态机——**房间注册表 `Map<roomId, RoomState>` + 活动房间视图 `activeRoomId`**（= UI 房）；join 竞态从「丢弃」改为「按 roomId 校验响应归属」；断线重连按注册表**全量重进**。**P2 启动即按此建模（单房为其特例），避免 P3 返工**；P2 验收口径不变（单房三步接入照旧）。
- **消息管线**：`chatroom-message.ts` 按 roomId 分桶；UI 房走完整管线，信令房只订阅增量、不进桶、不渲染（零渲染成本，与 5.3 渲染节流不冲突）；`pullHistory: false` 的信令房不拉历史（语义是订阅实时指令，历史回放由业务自调 API）。

### 5.10 headless 弹幕模式（无 UI 接入，一等公民）

> **需求背景**：弹幕轨道/飘屏/礼物特效是直播间强差异化 UI，成熟直播间几乎不用通用消息列表渲染弹幕；业务方需要的是「连接 + 房间 + 消息流 + 发送」的数据能力，渲染完全自管。2026-08-15 补充评审确认：**headless 不是新增模式，而是当前架构的自然形态**——composable 层（5.1）本就与容器平级、不依赖容器（uikit-im 22 个 composables 已证明该路线成熟），容器只是「把 composable 状态映射成模板」的薄壳；5.9 信令房透传（`signal-message`）就是 headless 的先行实例。**决策：headless 为一等公民，与容器模式并列，同一内核、同一份 API 契约。**

- **依赖方向（硬约束）**：store/composable 层**零组件 import**；容器是内核的「可选消费者」之一，**容器必须只消费公开 composable 契约，不得绕过公开 API 直取内部状态**——防止 headless 与容器 API 分叉成两套面（「第二 API 面」是唯一要防的风险）。
- **消息消费契约（headless 友好）**：`useChatroomMessage()` 除消息列表绑定外，提供 `subscribe(fn)` 增量有序回调 + **批量消费 + 可丢弃中间帧策略**——弹幕高吞吐时业务按自身帧率消费，UIKit 只保证「增量有序 + 批量能力」，不替业务决定丢帧。
- **渲染节流职责分层（修正 5.3 表述）**：UIKit 提供「缓冲队列 + 批量消费能力」，**默认容器用内置渲染节流**（5.3）；headless 下节流/丢帧策略由业务决定，**UIKit 不得在无消费者时自行丢弃消息**（保证可订阅性）。
- **事件面**：headless 下没有 notice 条/成员面板——进出房/禁言/公告/礼物等系统通知全部走**事件回调**（payload 为解码后的 domain 类型）；礼物即 custom 消息解码后透传。
- **发送/房间生命周期**：与容器共享同一内核（`useChatroom` / `useChatroomMessage` / `useChatroomMember`）；发送限流反馈由返回值/回调承载（headless 无输入框可展示，反馈必须程序化）。
- **与多房间订阅的关系**：headless 与 5.9 **正交**——「容器 + 信令房」「headless + 多房」任意组合，同一套 store 建模（注册表 Map + activeRoomId）同时服务两种消费形态。

## 六、复审修正记录（2026-08-15 评审，均已在仓库/SDK 实际代码验证）

1. **事件注册边界（架构修正）**：core 的 `registerEventHandlers` 硬编码单群聊全部 handler 与 stores（`sdk/event/registry.ts` 已核实）。修正：core 只保留连接级事件 + notice 工具 + 注册原语；场景级 handler 工厂留在各场景包 —— uikit 的 `registerEventHandlers` 对外签名原样保留；chatroom 包自建 `registerChatroomEventHandlers`。
2. **ManagerHost 缺 `chatRoomManager`（增量缺口）**：`client.ts` 的 `SdkChatClient.init({ managers: [...] })` 未注册 ChatRoomManager（已核实）。P1 抽核时 core 注册列表加入 `ChatRoomManager`，`ManagerHost` 增加 `chatRoomManager` 字段 —— 纯增量，不破坏现有 API。**P2 前置修正（2026-08-15 已落地）**：注册方式从「core 静态 import 全量 manager」改为「**场景包依赖注入**」——core 的 `ClientConfig.managers` 必填（未注入构造抛错），core 不再静态 import 任何 manager 类。原因：websdk 5.x 是 `sideEffects:false` + 按 manager 分 subpath 的 ESM，core 静态 import 会让所有场景的消费者都无法 tree-shake 无关 manager 代码。现状：uikit-im 注入 6 个 manager（不含 ChatRoomManager，IM 消费者可摇掉 websdk chatroom 代码）+ `enableSyncData: ['conversation','contact','group']`（原 core 默认值随迁，行为不变，延迟初始化路径同样补齐）；chatroom 包（P2）将只注入 `[ChatManager, ChatRoomManager, UserInfoManager]` 且不做场景化同步。**注入机制**：core provider options 新增 `resolveClientConfig?: (config: ClientConfig) => ClientConfig` 钩子，在 core `setupClient`（auto-init 与 `useClient().init()` 延迟初始化的唯一漏斗）统一应用——场景包只需传钩子，业务侧任何初始化路径都自动获得场景默认值（曾出现 uikit-im 只在自身 ctx.init 包装导致 `useClient().init()` 绕过默认注入的缺陷，由此修正）。
3. **websdk 单实例规则（确认）**：现有 vite.config 已把 `easemob-websdk` 放进 `rollupOptions.external`（已核实）。规则固化：**所有包一律 external `vue`/`pinia`/`easemob-websdk`，场景包再 external `@easemob/uikit-core`**，消费端永远只有一份 websdk 实例（连接/事件总线不分裂）。chatroom 包声明 `easemob-websdk` 同 range 依赖（适配层引用类型），构建时 external。
4. **i18n 合并机制缺失（core 小增量）**：locale 是模块级 messages 对象 + `useLocale`，无合并 API（`locale/index.ts` 已核实）。P1 给 core 加 `extendLocale(locale, keys)`（向后兼容），chatroom 安装时把自己的 keys（`chatroom.*` 前缀段）并入，不复制整个 locale 文件。**注意这不是「约 10 行」能收尾的事**，实施时需处理三个点：① 键冲突策略（同 key 后注册覆盖 or 报错，需定死）；② 合并后切换语言的响应式更新（已渲染组件须跟着变）；③ messages 若带 TS 类型约束，扩展 key 不能破坏现有类型推导。P1 任务清单中单独列项。
5. **房间属性实时性（表述修正）**：SDK 存在 `ATTRIBUTES_UPDATE`/`ATTRIBUTES_REMOVED` 等事件类型，具备实时通知能力；`useChatroomAttributes` 按 5.6 四层同步设计，确切事件名以实施时 SDK 实际 API 为准。
6. **双版本 changelog 工具（确认）**：`scripts/check-version-sync.mjs` 需升级为分别校验两包 version 与根 CHANGELOG 各自版本段一致（单一数据源原则不变），docs 站 changelog `@include` 同步适配。
7. **多房间订阅模型（补充评审，2026-08-15）**：私域直播双聊天室/多聊天室需求确认——SDK 支持多房并行（`joinChatRoom.leaveOtherRooms` 已核实，见 5.9）；UIKit 按「1 个 UI 房 + N 个信令房」建模。核心修正：`chatroom.ts` store **不写单房间状态机**，P2 即按「房间注册表 Map + activeRoomId 视图」两层建模（单房为特例）；信令房消息**透传回调**（`signal-message`）、零渲染零假设、默认不拉历史；不引入 `isMultiChatroom` 布尔开关（`signal-rooms` 数组存在即多房）。
8. **headless 弹幕模式（补充评审，2026-08-15）**：确认「无 UI 接入」为**一等公民**而非隐藏模式（见 5.10）——composable 层与容器解耦是既有架构事实，headless 只是把该契约显式化。核心修正：① **渲染节流职责分层**（5.3 表述修正为「容器默认内置节流；headless 由业务决定，UIKit 保证增量有序 + 批量消费能力、无消费者时不得丢消息」）；② 容器必须只消费公开 composable 契约，防止「第二 API 面」；③ P4 增 headless 弹幕 demo 页作验收。

## 七、边界情况与失败模式清单

- 无离线消息：进房必拉历史；展示「最近 N 条」提示。
- 大直播间刷屏：列表封顶 + 接收侧渲染节流（缓冲队列 + 按帧批量 append，见 5.3）；SDK 自带的是**发送侧**限流，与接收侧渲染节流是两个层面，互不替代。
- 被踢/解散/封禁：监听 CHATROOM_NOTIFY → toast + 退出态 + 事件通知接入方。
- 断线重连：SDK 自动重连连接，但**聊天室需重进** —— `useChatroom` 内置「连接恢复后自动重进房间」。
- 重复进入/快速切换房间：join 请求去重与竞态处理（房间 A 的响应晚于房间 B 的 join 时丢弃）。
- 全员禁言 vs 单禁言 vs 白名单并存时的 UI 态叠加。
- **大房间成员列表**：`getMemberList` 为分页接口，数千人房间不做全量加载——成员面板只渲染已加载页 + 显示「在线人数 vs 已加载」，滚动到底部分页加载；成员搜索/禁言操作基于服务端接口而非本地全量数据。
- **发送侧被 SDK 节流的 UI 反馈**：聊天室消息有发送频率限制，触发节流时输入框需给出明确反馈（禁用态/提示文案 + 恢复时机），不能静默失败。
- 未识别 custom 消息兜底渲染（见 5.5）。
- 变种属性 key 冲突 → 加场景前缀（见 5.6）。
- chatroom 包与单群聊包同时被同一应用安装时：事件按 manager + chatType 过滤互不污染（见 5.2）。
- **多房并行（UI 房 + 信令房，见 5.9）**：join 必须显式 `leaveOtherRooms: false`，否则可能「加入新房自动离开旧房」；信令房 join 失败/被踢/解散 → 降级为「信令不可达」回调（`signal-status` 事件），**不拖累 UI 房**；断线重连按注册表全量重进，信令房失败退避重试 + 回调；**跨房消息无全序**——两房不是同一时序流，业务不得按全序消费（商品指令与弹幕之间无先后保证）；`pullHistory: false` 的信令房不拉历史。
- **headless 弹幕接入（见 5.10）**：UIKit 不替业务决定丢帧——**无消费者时不得自行丢弃消息**（增量有序 + 批量消费契约兜底）；系统通知必须事件化出口（headless 无 notice 条可显示）；发送限流反馈程序化（无输入框）；容器与 headless 消费同一公开契约，禁止容器绕过公开 API 直取内部状态。

## 八、构建、版本与发布规则

- **构建**：沿用现有 vite 链路（lib 模式主 bundle + `vite.aux.config.ts` aux 入口：resolver / auto-imports）。core 按可树摇的 ESM 产物构建；场景包 vite 配置把 `@easemob/uikit-core` 加入 `rollupOptions.external`（连同 `vue`/`pinia`/`easemob-websdk`，见复审修正 3）。resolver / auto-imports / `./theme` 子路径导出按现有模式复制（`exports` 字段：`.` / `./resolver` / `./auto-imports` / `./theme`）。
- **版本**：两场景包独立版本，共用 core 用 range 约束（`^x.y.z`）；`pnpm changelog:check` 与根 CHANGELOG 扩展为**双版本段**结构（唯一数据源原则不变，见复审修正 6）。
- **core 版本纪律（防绑架转移）**：场景包之间互不绑架，但两包都 range 依赖 core——「发布绑架」只是从包内转移到了 core 上。纪律固化：**core 对外 API（导出、CSS 变量名、event 注册原语签名、locale key 结构）只增不改**；确需 breaking 变更时必须显式决策（评估两场景包同步升级成本并记入 CHANGELOG），禁止顺手重构。若 core 频繁被迫 breaking，重新评估「core 是否应独立版本」这一前提。
- **demo 模式**：`apps/demo` 当前为 workspace 源码直连模式（vite alias → `packages/uikit-im/src`，P0.5 实施时已确认）。若后续切回 tgz 验证模式，注意产物文件名已改为 `easemob-uikit-im-<version>.tgz`。
- **工具链防复制**：所有生成/检查脚本（gen:api、resolver、changelog、sync-docs）在第一处新包落地时就参数化，禁止复制脚本。

## 九、分阶段实施计划（每阶段结束门禁全绿：vue-tsc + build + demo typecheck + story + changelog:check）

> 时序说明：P0.5 与 P1 不依赖聊天室业务，可在 `@easemob/uikit` 1.x 收尾期提前启动；P2 起才正式进入聊天室开发。

- **P0 决策与基座准备**：确认设计（包名、共享边界清单、场景预设接口）。产出：本文档 + TECH-DEBT D97 登记。（已完成，2026-08-15）
- **P0.5 纯改名 `@easemob/uikit` → `@easemob/uikit-im`**（**已完成，2026-08-15**）：**零代码结构变化，只改包名与全仓引用**——目录 `packages/uikit` → `packages/uikit-im`、`package.json` name、demo alias 与依赖声明（实施时 demo 已恢复 workspace 源码模式，无 tgz 产物名需处理）、docs 站（vitepress 配置/gen:api/组件页包名）、`packages/mcp` 数据源与 `scripts/sync-docs.mjs`、`integrations/skills` reference、`scripts/check-version-sync.mjs` 与 CHANGELOG 版本段约定、resolver/auto-imports 包名常量、README/AGENTS.md/skill 路由表。**改名与抽核必须分离**，同阶段混入则回归无法定位。验收：门禁全绿 + 全仓 grep 无 `@easemob/uikit`（非 `-im`/`-core`/`-chatroom` 后缀）残留。**豁免项（伞形产物保留原名）**：`@easemob/uikit-mcp`（MCP 服务，未来覆盖三包文档数据）与 `easemob-uikit-integration`（集成侧 skill 名，面向全部场景包的接入者），二者不随单群聊包改名。
- **P1 抽核 `@easemob/uikit-core`**：**第一个产出物是「逐组件/逐模块迁移判定清单」**——每个原子组件/composable/store 先判定「进 core / 留 uikit-im / 视依赖待定」（UserCard 等待定项在此全部定论），评审通过后再动手迁移，禁止边迁边判。迁移顺序：「sdk 层（含 ChatRoomManager 注册 + ManagerHost 增量）→ 原子组件 → theme/locale/constants/utils（含 `extendLocale`）→ client/theme store → Provider → 共享 composables」逐层迁移，`@easemob/uikit-im` 全量 re-export core 保持组件/composable 对外签名不变；**每移一层跑一次门禁**；恢复 demo alias 模式回归。验收：现有 demo/docs/MCP 数据全部照常，`@easemob/uikit-im` 类型与构建 0 回归，core 包独立可构建。
- **P2 聊天室包骨架**（**已完成，2026-08-15**）：package 脚手架（含 resolver/auto-imports/theme/locale 扩展）、**CHANGELOG 双版本工具升级（从 P5 前移至此——包骨架一落地 version 就需要被 `changelog:check` 校验）**、chatroom domain/adapter/event、chatroom store（**按 5.9「房间注册表 Map + activeRoomId」两层建模，单房为其特例**）、`EmChatroomContainer` 外壳（加入/退出/历史/消息收发/成员面板/系统通知/基础插槽）、H5 容器样式。验收：独立 demo 页三步接入跑通基础聊天室（**已达成**：apps/demo `#/chatroom` 页嵌套 IM Provider 验证两包同装，TECH-DEBT D97 进度记录）。
- **P3 场景预设系统**（**已完成，2026-08-15**）：scene config 类型 + 三内置 preset（`LIVE_ROOM_SCENE`/`VOICE_ROOM_SCENE`/`CLASS_ROOM_SCENE` 模块加载即注册）+ `useChatroomScene`（`themeOverrides` 容器根元素应用 + `i18nOverrides` locale 并入）+ 插槽全接线（含 `gift-bar`/`mic-queue`）；礼物（custom 消息 `CHATROOM_GIFT_EVENT` 协议 + `ChatroomGiftBar` + 消息项礼物渲染，未识别 custom 仍兜底）；麦位（语聊房 `ChatroomMicQueue`，状态存 `voice:micQueue` 房间属性 JSON）；禁言/公告（编辑 Popup）/黑名单管理（成员面板 tab）；`useChatroomAttributes`；**多房间订阅（UI 房 + 信令房：`signal-rooms` 配置 + `signal-message`/`signal-status` 透传回调 + `useChatroomMessage` 按 roomId 发送 + 断线全量重进，见 5.9）**；**headless 契约（`subscribe` 增量有序 + flush 批量消费 + 可丢弃中间帧策略，容器只消费公开契约，见 5.10）**。验收已达成：三个变种仅靠 config+插槽实现（demo 场景切换按钮实证）；headless 契约在容器与纯 JS 消费两种形态下行为一致（demo headless 订阅面板实证）。**P3 review（2026-08-15）修复 5 处缺陷后验收口径成立**：subscribe 跟随活动房间（此前进房前订阅永久失效，demo headless 面板在标准流程收不到消息）；UI 房换房只清理旧 UI 房保留信令房（此前 reset 清空注册表）；UI 房 join 显式 `leaveOtherRooms: false`（此前默认 true 会踢掉并行信令房）；信令房 `pullHistory` 改为按序经 `signal-message` 透传（此前拉取被活动房守卫丢弃）；join 超时失效按房间令牌校验（store 增 `roomJoinToken`）。详见 TECH-DEBT D97 复核记录。
- **P4 变种 Demo（H5-first）**（**已完成，2026-08-15**）：新 app `apps/demo-chatroom`（375px 移动视口居中壳、纯 chatroom 单包形态、登录复用 `uikit_demo_login_config`）——基础聊天室 + 语聊房 + 私域直播/带货 + 小班课 四个页面（均按「正常场景页面」标准：场景化导航/入口卡/完整交互闭环）+ **纯弹幕 headless 页**（无容器、自绘弹幕轨道 + 礼物飘屏 + 系统通知条，实证 headless 契约与 store 建模的 UI 解耦）。私域直播页同时实证 `signal-rooms` 双房链路（商品指令发信令房 → signal-message 回调 → 写 `live:product` 属性 → 商品卡全房间刷新）。验收：五个页面 dev server 冒烟通过、门禁全绿。
- **P5 文档与集成**：docs 站聊天室章节（gen:api、demo 块、sidebar）、聊天室集成 skill（`integrations/skills`）、MCP 数据更新（`scripts/sync-docs.mjs`）。（**docs 双 UIKit 架构骨架已提前落地，2026-08-15**：`apps/docs` 复用 VitePress locales 承载 `/` 与 `/chatroom/` 两套并列文档树，顶部标题旁 `UiKitDocsSwitcher` 切换；聊天室侧现有 index / architecture / quickstart / chatroom-container 占位页，组件页与 API 表格待 P2/P3 产出后按本计划补齐。）
- **P5 增量：PC 模式与角色能力（2026-08-15 评审后实施）**：见 §11——split 分栏布局（`layout` 死字段变活）、`canManageMember` 权限原语上提、`manage-actions` 管理位插槽 + `features.management` 开关组、`ChatroomContextMenu`/`ChatroomMemberSidebar`/`ChatroomSplitLayout`（`modules/chatroom/pc/`）、弹层退化 `popupMode`、输入条多行与 Esc 键盘交互；**业务角色不内置**（demo 层 `demo-role.ts` 参考实现 + `#/pc-live`/`#/pc-class` 宽屏验收页）；docs「权限模型与业务角色」页落盘权限矩阵与角色抽象指南；版本 0.2.0。

## 十一、PC 模式与角色边界（2026-08-15 评审决策，P5 增量）

> **需求背景**：私域直播的开播端是 PC 网页/Electron，H5 只是观众端；小班课师生都在
> PC web。纯 H5 不够，且 PC 交互与角色权限不同——主播可禁言某人/移除某人/发布公告/
> 上架商品等。用户评审定案（关键决策）：**角色不内置，UIKit 权限面天花板 = SDK 原生
> 权限（owner/admin/member/none）**，业务角色由应用层自行抽象。

### 11.1 决策：业务角色由应用层抽象，UIKit 只做权限能力

理由：① 服务端只认权限——任何业务角色最终落到 owner/admin/member 才能执行操作，
内置「anchor/teacher」枚举服务端无法理解，只能自欺欺人做 UI 显隐；② 业务角色无界
（主播/场控/客服/嘉宾/助教……），内置枚举必然 churn API；③ 与「壳子 vs 内容」哲学
及 headless 一等公民（§5.10）自洽；④ 角色名单可存房间属性（§5.6 KV 四层同步），
持久化问题 UIKit 已解决。详见 docs「权限模型与业务角色」。

- **不新增**：`CHATROOM_PLAYER_ROLE` 枚举、`player-role` prop、`useChatroomRole`——角色概念不进包；
- **补齐权限原语**：`useChatroomMember.canManageMember(target)`——原内嵌成员面板的
  「当前用户能否管理目标成员」判定（不能管房主/自己、admin 只能由 owner 管理）上提为公开 API；
- **能力壳子**（按 `canManage` 门控，与角色无关）：
  - **`layout: 'split'` 实现**（§5.5 死字段变活）：三栏 [舞台 `#stage` | 消息主栏 |
    成员侧栏]，成员栏宽度可拖拽（core `useResizable`，200~480 clamp），窄视口
    （<768px）成员侧栏退化为 H5 底部弹层；`layout: 'auto'` 按视口自动选择；
  - **`#manage-actions` 插槽**（`canManage` 门控）+ `features.management` 开关组
    （mute/kick/muteAll/announcement/blocklist/admin）——业务把「上架商品/公告」等
    操作台入口放插槽，UIKit 不感知业务角色；
  - **PC 交互**：成员行 hover 快捷操作（`@media (hover:hover)` 包裹）、
    `ChatroomContextMenu` 右键菜单（视口翻转/点击外部/Esc 关闭）、危险操作居中确认
    弹窗、`popupMode` 弹层退化（宽视口 sheet→dialog，成员/礼物/表情面板）、
    输入条多行（textarea + Shift+Enter 换行）、Esc 关闭弹层（`useEscToClose`）；
  - 新模块目录 `modules/chatroom/pc/`：`ChatroomSplitLayout` / `ChatroomMemberSidebar` /
    `ChatroomContextMenu`；
- **Demo 示范**：`apps/demo-chatroom` 新增 `src/demo-role.ts`（业务角色抽象参考实现：
  主播=owner / 场控=admin / 观众=member；老师=owner / 学生=member，演示「场控=admin」
  角色与权限解耦）+ 宽屏路由 `#/pc-live`（开播端三栏 + 管理位 + 信令房双房商品链路）
  与 `#/pc-class`（双端角色切换，不套 375px 手机壳）；
- **文档**：docs「权限模型与业务角色」页（权限矩阵 + 角色抽象指南 + 名单存房间属性建议）、
  quickstart PC 接入段、PC 组件页（split/成员侧栏/右键菜单 + scene 扩展字段）。

### 11.2 向后兼容

`layout` 缺省 `fullscreen`、`popupMode` 缺省 `auto`（H5 视口行为与现状一致）、新增
prop 全部可选——P2~P4 五变种 demo 页零回归；H5 页面在桌面浏览器打开仍保持 H5 形态。

### 11.3 边界情况

- **角色与权限冲突**（member 账号切「主播」视角）：管理 UI 按 `canManage` 不出现 +
  服务端拒绝兜底（现有 toast 链路）——UIKit 无需感知角色；
- **窄窗口 split 坍缩**：成员侧栏退化为弹层（header 成员按钮），主栏优先；
- **多容器并存**：角色是业务层状态（页面局部），无全局污染；
- **Electron**：v1 单窗口 split 分栏为主；多窗口由业务每窗口一个 Provider/容器实例
  （不提供多窗口 UIKit 原语）。

## 十、明确假设（实施时如与预期不符，以当时实际情况为准）

1. **RTC/音频不在 v1 范围**：语聊房麦位 = IM 信令 + 房间状态（属性存储），音频推拉流由接入方选型（声网/TRTC）；聊天室包不依赖任何 RTC SDK。
2. 聊天室包命名 `@easemob/uikit-chatroom`，核心包命名 `@easemob/uikit-core`，单群聊包改名 `@easemob/uikit-im`（P0.5 执行），容器组件名 `EmChatroomContainer`。
3. 聊天室包独立版本号，与 `@easemob/uikit-im` 互不绑架（共享 core 用 range 约束）。
4. 变种首期交付三个内置 preset（语聊房 / 私域直播带货 / 小班课），更多场景靠插槽由用户自建。
5. 实施时若 `easemob-websdk` 已升级，以当时的 `ChatRoomManager` 实际 API 为准做 adapter 映射（本文档 API 清单基于 5.0.0 核实）。
6. **多房并行（见 5.9）**：SDK `joinChatRoom` 支持并行多房（`leaveOtherRooms: false`）；服务端多房并发上限、`leaveOtherRooms` 默认值、信令房历史消息可达性以实施时 SDK/服务端实际行为为准。
7. **业务角色不进 UIKit（见 §11）**：服务端权限模型不变（permissionType 快照）；业务角色纯客户端/业务层概念，UIKit 不感知；断点沿用 core `isMobile`（768px）；多窗口 Electron 不在 v1。
