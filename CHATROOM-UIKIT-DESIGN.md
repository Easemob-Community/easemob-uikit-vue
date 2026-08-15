# 聊天室 UIKit（`@easemob/uikit-chatroom`）设计规划

> 状态：**设计已评审、待实施**（2026-08-15 落盘）。按用户时序，`@easemob/uikit` 1.x 开发完成后启动实施。
> 对应 TECH-DEBT [D97](#d97)。
> 范围：架构决策、三包边界、聊天室包内部设计、场景预设系统、H5 要点、构建/版本规则、P0→P5 分阶段计划。
> 本文档只做决策沉淀，不含实施代码；实施时以当时 `easemob-websdk` 实际 API 为准复核（见「明确假设」）。

---

## 一、背景与结论

环信 IM 的**聊天室（Chatroom）**与单聊/群聊场景几乎不重合：聊天室典型场景为中大型直播间、语聊房、小班课、私域直播/带货直播（H5 居多），无离线消息、无未读/回执、无会话列表概念，消息是广播流；而单群聊 UIKIT 围绕会话/联系人/群组/回执体系构建。两者**极少同时被同一接入方需要**。

**核心结论**：不在 `@easemob/uikit` 内追加聊天室功能，也不复制一套共享代码，而是抽取共享基座 `@easemob/uikit-core`，聊天室作为独立场景包 `@easemob/uikit-chatroom` 与现有单群聊包并列：

```
packages/
  uikit-core/       ← 共享内核：sdk 抽象层、主题、i18n、常量、工具、原子组件、Provider 生命周期
  uikit/            ← 现有包瘦身：core + 会话/通讯录/群组/聊天 场景层（对外 API 完全兼容）
  uikit-chatroom/   ← 新增：core + 聊天室场景层（房间/消息/成员/禁言/公告/房间属性 + 场景预设）
```

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
| **C. 独立包 + `@easemob/uikit-core`（推荐）** | 场景隔离 + 基座单一维护；单群聊包对外 API 零变化；聊天室 H5 bundle 不含 1v1 场景代码 | 需要一次机械性抽核重构（见 P1，风险可控，逐层迁移 + 每步门禁） |

**原则：按场景分包、按基座共享。** 包按场景分，**不按子场景分**——不做 `uikit-live`/`uikit-voice` 子包；若未来某个变种被证明有独立复用的需求再拆。

## 四、三包职责边界

### 4.1 共享边界（进 core，两场景包共用）

- `sdk/` 层：client/`ManagerHost` 抽象、连接级事件（client store、token 过期、断线重连）、notification 引擎、notice 工具（`insertChatNotice`/`createNoticeMessage` 等）、domain 基础模型（user-info、presence 是共用的）
- `theme/`（CSS 变量体系 + 暗色）、`locale/`、`constants/`、`utils/`
- 原子组件：Avatar、Icon、IconButton、Button、Input、Modal、Popup、Toast、ActionSheet、Badge、Empty、ImageViewer、CopyableText、ScrollToTop、StatusBanner、Notification、Cell 系列、PresenceAvatar 等（**判定原则：只依赖通用能力（client/user-info/presence/theme/locale）的进 core；依赖会话/通讯录/群组 domain 的留在 uikit**，如 GroupCard 留 uikit，UserCard 视其依赖而定，P1 逐组件判定）
- Provider 生命周期：`EmUIKitProvider`（client 初始化/token/features/theme）移入 core，uikit re-export 保持兼容
- 共享 composables：`useClient`、`useTheme`、`useUserInfo`/`useOwnUserInfo`、`usePresence`、`useNotification`、`useToast`、H5 通用工具（`useH5Adaptation`、`useKeyboard`、`useLongPress`、`usePullRefresh`、`useViewport`、`useBottomSheet`、`useRipple` 等 domain 无关项）

### 4.2 不共享的边界（共享基座，不共享场景状态）

- **单群聊包独有**：conversation/contact/group/message store 与 modules、会话/通讯录/群组/聊天容器、tiptap 编辑器、已读回执/置顶/合并转发/消息搜索等交互、`registerEventHandlers`（对外签名不变）
- **聊天室包独有**：chatroom store（房间状态 + 广播消息流）、成员管理、禁言/黑名单/白名单、公告、房间属性、礼物、麦位等

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
- `chatroom-message.ts`：广播消息流 —— 进房 `getHistoryMessages` 拉最近 N 条 + 增量追加，**无未读/无会话/无回执语义**；渲染列表封顶（如保留最近 200 条）+ 批量合并，防大直播间刷屏。
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
2. **ManagerHost 缺 `chatRoomManager`（增量缺口）**：`client.ts` 的 `SdkChatClient.init({ managers: [...] })` 未注册 ChatRoomManager（已核实）。P1 抽核时 core 注册列表加入 `ChatRoomManager`，`ManagerHost` 增加 `chatRoomManager` 字段 —— 纯增量，不破坏现有 API。
3. **websdk 单实例规则（确认）**：现有 vite.config 已把 `easemob-websdk` 放进 `rollupOptions.external`（已核实）。规则固化：**所有包一律 external `vue`/`pinia`/`easemob-websdk`，场景包再 external `@easemob/uikit-core`**，消费端永远只有一份 websdk 实例（连接/事件总线不分裂）。chatroom 包声明 `easemob-websdk` 同 range 依赖（适配层引用类型），构建时 external。
4. **i18n 合并机制缺失（core 小增量）**：locale 是模块级 messages 对象 + `useLocale`，无合并 API（`locale/index.ts` 已核实）。P1 给 core 加 `extendLocale(locale, keys)`（约 10 行，向后兼容），chatroom 安装时把自己的 keys（`chatroom.*` 前缀段）并入，不复制整个 locale 文件。
5. **房间属性实时性（表述修正）**：SDK 存在 `ATTRIBUTES_UPDATE`/`ATTRIBUTES_REMOVED` 等事件类型，具备实时通知能力；`useChatroomAttributes` 按 5.6 四层同步设计，确切事件名以实施时 SDK 实际 API 为准。
6. **双版本 changelog 工具（确认）**：`scripts/check-version-sync.mjs` 需升级为分别校验两包 version 与根 CHANGELOG 各自版本段一致（单一数据源原则不变），docs 站 changelog `@include` 同步适配。

## 七、边界情况与失败模式清单

- 无离线消息：进房必拉历史；展示「最近 N 条」提示。
- 大直播间刷屏：列表封顶 + 节流；SDK 自带聊天室限流，UI 层不重复造。
- 被踢/解散/封禁：监听 CHATROOM_NOTIFY → toast + 退出态 + 事件通知接入方。
- 断线重连：SDK 自动重连连接，但**聊天室需重进** —— `useChatroom` 内置「连接恢复后自动重进房间」。
- 重复进入/快速切换房间：join 请求去重与竞态处理（房间 A 的响应晚于房间 B 的 join 时丢弃）。
- 全员禁言 vs 单禁言 vs 白名单并存时的 UI 态叠加。
- 未识别 custom 消息兜底渲染（见 5.5）。
- 变种属性 key 冲突 → 加场景前缀（见 5.6）。
- chatroom 包与单群聊包同时被同一应用安装时：事件按 manager + chatType 过滤互不污染（见 5.2）。

## 八、构建、版本与发布规则

- **构建**：沿用现有 vite 链路（lib 模式主 bundle + `vite.aux.config.ts` aux 入口：resolver / auto-imports）。core 按可树摇的 ESM 产物构建；场景包 vite 配置把 `@easemob/uikit-core` 加入 `rollupOptions.external`（连同 `vue`/`pinia`/`easemob-websdk`，见复审修正 3）。resolver / auto-imports / `./theme` 子路径导出按现有模式复制（`exports` 字段：`.` / `./resolver` / `./auto-imports` / `./theme`）。
- **版本**：两场景包独立版本，共用 core 用 range 约束（`^x.y.z`）；`pnpm changelog:check` 与根 CHANGELOG 扩展为**双版本段**结构（唯一数据源原则不变，见复审修正 6）。
- **demo 模式**：`apps/demo` 目前处于 tgz 验证模式（`file:../../easemob-uikit-1.6.0.tgz`）；P1 抽核期间恢复源码 alias 模式（或按当时状态决定），保证 demo 类型检查与源码一致。
- **工具链防复制**：所有生成/检查脚本（gen:api、resolver、changelog、sync-docs）在第一处新包落地时就参数化，禁止复制脚本。

## 九、分阶段实施计划（每阶段结束门禁全绿：vue-tsc + build + demo typecheck + story + changelog:check）

- **P0 决策与基座准备**：确认设计（包名、共享边界清单、场景预设接口）。产出：本文档 + TECH-DEBT D97 登记。（已完成，2026-08-15）
- **P1 抽核 `@easemob/uikit-core`**：按「sdk 层（含 ChatRoomManager 注册 + ManagerHost 增量）→ 原子组件 → theme/locale/constants/utils（含 `extendLocale`）→ client/theme store → Provider → 共享 composables」逐层迁移，`@easemob/uikit` 全量 re-export core 保持对外 API 不变；**每移一层跑一次门禁**；恢复 demo alias 模式回归。验收：现有 demo/docs/MCP 数据全部照常，`@easemob/uikit` 类型与构建 0 回归，core 包独立可构建。
- **P2 聊天室包骨架**：package 脚手架（含 resolver/auto-imports/theme/locale 扩展）、chatroom domain/adapter/event、chatroom store、`EmChatroomContainer` 外壳（加入/退出/历史/消息收发/成员面板/系统通知/基础插槽）、H5 容器样式。验收：独立 demo 页三步接入跑通基础聊天室。
- **P3 场景预设系统**：scene config 类型 + 三内置 preset + `useChatroomScene` + 插槽全接线；礼物（custom 消息）与兜底渲染；麦位（语聊房）；禁言/公告/黑名单管理；`useChatroomAttributes`。验收：三个变种均仅靠 config+插槽实现。
- **P4 变种 Demo（H5-first）**：新 app `apps/demo-chatroom`（移动视口、自动登录、Dev Hints 复用 demo 模式）：基础聊天室 + 语聊房 + 私域直播/带货 + 小班课 四个页面。
- **P5 文档与集成**：docs 站聊天室章节（gen:api、demo 块、sidebar）、聊天室集成 skill（`integrations/skills`）、MCP 数据更新（`scripts/sync-docs.mjs`）、CHANGELOG 双版本工具升级。

## 十、明确假设（实施时如与预期不符，以当时实际情况为准）

1. **RTC/音频不在 v1 范围**：语聊房麦位 = IM 信令 + 房间状态（属性存储），音频推拉流由接入方选型（声网/TRTC）；聊天室包不依赖任何 RTC SDK。
2. 聊天室包命名 `@easemob/uikit-chatroom`，核心包命名 `@easemob/uikit-core`，容器组件名 `EmChatroomContainer`。
3. 聊天室包独立版本号，与 `@easemob/uikit` 互不绑架（共享 core 用 range 约束）。
4. 变种首期交付三个内置 preset（语聊房 / 私域直播带货 / 小班课），更多场景靠插槽由用户自建。
5. 实施时若 `easemob-websdk` 已升级，以当时的 `ChatRoomManager` 实际 API 为准做 adapter 映射（本文档 API 清单基于 5.0.0 核实）。
