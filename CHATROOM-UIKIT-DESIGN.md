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
- 命名插槽清单（每个边界都开槽）：`header` / `toolbar` / `message-item` / `message-custom`（对齐现有插槽习惯）/ `gift-bar` / `mic-queue` / `member-item` / `member-panel` / `empty` / `notice` / `input-bar`。
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

## 六、复审修正记录（2026-08-15 评审，均已在仓库/SDK 实际代码验证）

1. **事件注册边界（架构修正）**：core 的 `registerEventHandlers` 硬编码单群聊全部 handler 与 stores（`sdk/event/registry.ts` 已核实）。修正：core 只保留连接级事件 + notice 工具 + 注册原语；场景级 handler 工厂留在各场景包 —— uikit 的 `registerEventHandlers` 对外签名原样保留；chatroom 包自建 `registerChatroomEventHandlers`。
2. **ManagerHost 缺 `chatRoomManager`（增量缺口）**：`client.ts` 的 `SdkChatClient.init({ managers: [...] })` 未注册 ChatRoomManager（已核实）。P1 抽核时 core 注册列表加入 `ChatRoomManager`，`ManagerHost` 增加 `chatRoomManager` 字段 —— 纯增量，不破坏现有 API。**P2 前置修正（2026-08-15 已落地）**：注册方式从「core 静态 import 全量 manager」改为「**场景包依赖注入**」——core 的 `ClientConfig.managers` 必填（未注入构造抛错），core 不再静态 import 任何 manager 类。原因：websdk 5.x 是 `sideEffects:false` + 按 manager 分 subpath 的 ESM，core 静态 import 会让所有场景的消费者都无法 tree-shake 无关 manager 代码。现状：uikit-im 注入 6 个 manager（不含 ChatRoomManager，IM 消费者可摇掉 websdk chatroom 代码）+ `enableSyncData: ['conversation','contact','group']`（原 core 默认值随迁，行为不变，延迟初始化路径同样补齐）；chatroom 包（P2）将只注入 `[ChatManager, ChatRoomManager, UserInfoManager]` 且不做场景化同步。**注入机制**：core provider options 新增 `resolveClientConfig?: (config: ClientConfig) => ClientConfig` 钩子，在 core `setupClient`（auto-init 与 `useClient().init()` 延迟初始化的唯一漏斗）统一应用——场景包只需传钩子，业务侧任何初始化路径都自动获得场景默认值（曾出现 uikit-im 只在自身 ctx.init 包装导致 `useClient().init()` 绕过默认注入的缺陷，由此修正）。
3. **websdk 单实例规则（确认）**：现有 vite.config 已把 `easemob-websdk` 放进 `rollupOptions.external`（已核实）。规则固化：**所有包一律 external `vue`/`pinia`/`easemob-websdk`，场景包再 external `@easemob/uikit-core`**，消费端永远只有一份 websdk 实例（连接/事件总线不分裂）。chatroom 包声明 `easemob-websdk` 同 range 依赖（适配层引用类型），构建时 external。
4. **i18n 合并机制缺失（core 小增量）**：locale 是模块级 messages 对象 + `useLocale`，无合并 API（`locale/index.ts` 已核实）。P1 给 core 加 `extendLocale(locale, keys)`（向后兼容），chatroom 安装时把自己的 keys（`chatroom.*` 前缀段）并入，不复制整个 locale 文件。**注意这不是「约 10 行」能收尾的事**，实施时需处理三个点：① 键冲突策略（同 key 后注册覆盖 or 报错，需定死）；② 合并后切换语言的响应式更新（已渲染组件须跟着变）；③ messages 若带 TS 类型约束，扩展 key 不能破坏现有类型推导。P1 任务清单中单独列项。
5. **房间属性实时性（表述修正）**：SDK 存在 `ATTRIBUTES_UPDATE`/`ATTRIBUTES_REMOVED` 等事件类型，具备实时通知能力；`useChatroomAttributes` 按 5.6 四层同步设计，确切事件名以实施时 SDK 实际 API 为准。
6. **双版本 changelog 工具（确认）**：`scripts/check-version-sync.mjs` 需升级为分别校验两包 version 与根 CHANGELOG 各自版本段一致（单一数据源原则不变），docs 站 changelog `@include` 同步适配。

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
- **P2 聊天室包骨架**：package 脚手架（含 resolver/auto-imports/theme/locale 扩展）、**CHANGELOG 双版本工具升级（从 P5 前移至此——包骨架一落地 version 就需要被 `changelog:check` 校验）**、chatroom domain/adapter/event、chatroom store、`EmChatroomContainer` 外壳（加入/退出/历史/消息收发/成员面板/系统通知/基础插槽）、H5 容器样式。验收：独立 demo 页三步接入跑通基础聊天室。
- **P3 场景预设系统**：scene config 类型 + 三内置 preset + `useChatroomScene` + 插槽全接线；礼物（custom 消息）与兜底渲染；麦位（语聊房）；禁言/公告/黑名单管理；`useChatroomAttributes`。验收：三个变种均仅靠 config+插槽实现。
- **P4 变种 Demo（H5-first）**：新 app `apps/demo-chatroom`（移动视口、自动登录、Dev Hints 复用 demo 模式）：基础聊天室 + 语聊房 + 私域直播/带货 + 小班课 四个页面。
- **P5 文档与集成**：docs 站聊天室章节（gen:api、demo 块、sidebar）、聊天室集成 skill（`integrations/skills`）、MCP 数据更新（`scripts/sync-docs.mjs`）。

## 十、明确假设（实施时如与预期不符，以当时实际情况为准）

1. **RTC/音频不在 v1 范围**：语聊房麦位 = IM 信令 + 房间状态（属性存储），音频推拉流由接入方选型（声网/TRTC）；聊天室包不依赖任何 RTC SDK。
2. 聊天室包命名 `@easemob/uikit-chatroom`，核心包命名 `@easemob/uikit-core`，单群聊包改名 `@easemob/uikit-im`（P0.5 执行），容器组件名 `EmChatroomContainer`。
3. 聊天室包独立版本号，与 `@easemob/uikit-im` 互不绑架（共享 core 用 range 约束）。
4. 变种首期交付三个内置 preset（语聊房 / 私域直播带货 / 小班课），更多场景靠插槽由用户自建。
5. 实施时若 `easemob-websdk` 已升级，以当时的 `ChatRoomManager` 实际 API 为准做 adapter 映射（本文档 API 清单基于 5.0.0 核实）。
