# Vue3 UIKit Provider 配置契约（UIKitProvider / features / dataSource）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-provider-config**。

## 触发词

- `provider` / `UIKitProvider` / `useUIKitProvider` / `useUIKit()`
- `features` / `功能开关` / `enableContact` / `enablePresence` / `enableBlocklist`
- `dataSource` / `数据源接管` / `fetchContacts` / `searchUsers`
- `延迟初始化` / `autoInit` / `useClient().init`
- `token 过期` / `onTokenExpired` / `onTokenWillExpire`
- `主题配置` / `theme prop` / `bubbleColor` / `fontSize`

## 目标

`<UIKitProvider>` 是 UIKit 的装配入口：创建 SDK Client、注册事件、装配 8 个 store 与 6 个 domain，
并向全树 provide `UIKitContext`。本 skill 说明其**配置契约**（props 全清单、features/dataSource
的响应式机制、登录后副作用时序、延迟初始化、logout 清理链），避免四类翻车：

1. 把 features 当静态快照——运行时改 prop 不生效；
2. 业务数据源与 SDK 默认场景混用，踩好友列表「抢跑锁定 loaded」时序；
3. 在 `<UIKitProvider>` 外调用 `useUIKit()` 直接 throw；
4. 通知点击只 `setCurrentConversationId` 不做 enter/回执，未读数 1→0 闪烁。

## 1. ProviderProps 全清单与默认值（`containers/uikit-provider/uikit-provider.vue`）

### 1.1 核心连接与生命周期

- `appKey` — SDK 应用标识；为空时仍创建上下文，但 client 无法完成登录
- `sdkConfig` — `Omit<ClientConfig, 'appKey'>`，与 appKey 合并成最终 ClientConfig
- `autoInit` — 默认 `true`；`false` 时由业务 `useClient().init(config)` 延迟初始化（见 §4）
- `onTokenWillExpire` / `onTokenExpired` — 连接级回调，经 `connectionCallbacks` 注册

### 1.2 theme（`containers/uikit-provider` 的 `applyThemeConfig`）

```
theme?: {
  mode?: 'light' | 'dark' | 'auto'        // auto 跟随系统
  primaryColor?: number
  gap?: number                            // 容器间距 px，默认 8，最小 0
  shape?: 'ground' | 'square'             // 圆角 / 直角
  fontSize?: 'normal' | 'large' | 'xlarge' | number  // 档位映射 1 / 1.125 / 1.25，或具体 scale
  density?: 'compact' | 'normal' | 'comfortable'
  bubbleColor?: string | { self?: string; other?: string }  // 字符串同时设双方；对象分设
  chatBg?: string                         // 支持颜色 / 渐变 / url(...) 图片
  inputBg?: string
}
```

- 应用时机：`onMounted` 应用一次 + `watch(theme, deep)` 响应式；**未传字段保持当前值不变**；
- `h5.fontScale` 兼容：仅当 `theme.fontSize` 未显式指定时，作为初始字号缩放值；
- `animation` 在 onMounted 时 `applyAnimationConfig` 应用一次。

### 1.3 locale / h5

- `locale` — `'zh-CN'`（默认）| `'en'`，onMounted 时 `setLocale`；
- `h5` — 安全区 / 键盘适配 / 下拉刷新等（见 skill `uikit-h5-adaptation`）；
  watch 监听 `props.h5.safeArea`：运行期切换时覆写/移除 `--uikit-safe-*` 四个 CSS 变量。

### 1.4 功能开关 enable 类开关（withDefaults 默认值）

- `enableContact: false` / `enableBlocklist: false` / `enablePresence: false` — 默认关闭
- `enableGroup: true` / `enableUserInfo: true` / `enableUserInfoSubscription: true` — 默认开启
- `enableDraft: true` / `enableAtMe: true` / `enableTyping: true` — 默认开启
- `contactFetchMode: 'page'`（'page' 实际按全量返回处理；'all' 一次性全量拉取）
- `enableToast: true` — 关闭后仍可 `useToast()` 取状态自渲染

### 1.5 notification（详见 skill `uikit-notification`）

- `enable` / `browser` / `inApp` / `autoRequestPermission` 默认全 `true`；
- `triggerMode: 'background'`（仅页面隐藏时触发）| `'always'`（非当前会话即触发）；
- `navigateOnClick: true` — 点击通知跳转对应会话；
- `watch(notification, deep + immediate)` → `configureNotification` + `setNotificationClickHandler`，
  运行时改 prop 即刻生效。

### 1.6 dataSource（`composables/types.ts` 的 `UIKitDataSource`）

- `fetchContacts` / `fetchBlocklist` / `fetchGroups` — 列表类数据源，返回 `{ list, cursor?, hasMore? }`
- `fetchPresence` / `subscribePresence` / `unsubscribePresence` — 在线状态
- `fetchUserInfos` — 用户资料；数组至少含 `userId`，可选 `nickname/avatarUrl/sign/ext`
- `searchUsers` — 服务端搜索用户（不传时添加联系人退化为直接输入 userId）
- `addContact` / `createGroup` — 业务先登记自有系统再调 SDK 的动作接管
- 任一接口不传 → 走 SDK 默认实现；传入 → 业务接管该接口。

## 2. features：响应式开关（运行时切换即生效）

- Provider 内部 `features` 是 **computed**，把 `enableContact` 等 props 逐项映射；
- `useUIKitProvider` 收到 computed 后，用 `Object.defineProperty` 给 `ctx.features` 每个 key 挂
  **getter 惰性解析**（`{ ...defaultFeatures, ...options.features.value }`），每次读取都是最新值；
- 因此**运行时切换 enableContact / enablePresence 等 prop 即刻生效**，初始化行为不变；
- `defaultFeatures` 完整值（`composables/use-uikit.ts`）：`enableContact/enableBlocklist true`、
  `enablePresence false`、`presenceStrangerMode 'none'`、`fetchGroupMemberPresenceOnVisible true`、
  `contactFetchMode 'page'`、`enableGroup/enableUserInfo/enableUserInfoSubscription true`、
  `enableInvitePersistence true`、`enableDraft/enableAtMe/enableTyping true`。

注意：Provider `withDefaults` 与 `defaultFeatures` 的值**故意不一致**（如 enableContact：
Provider 默认 `false` 保守，defaultFeatures 默认 `true` 供直接 `useUIKitProvider` 且未显式传参时
兜底）。Provider 传入的 computed 始终覆盖 defaultFeatures，实际生效以 Provider props 为准。

## 3. dataSource：Proxy 惰性代理

- `ctx.dataSource` 是 **Proxy**：`get/has/ownKeys/getOwnPropertyDescriptor` 全部委托到
  `resolveDataSource()`，每次属性访问解析最新值（支持传入 computed）；
- 例外：`UserInfoDomain` 在构造时解析**一次快照**（初始化行为不变），其余域运行期读代理。

## 4. 登录后副作用时序（`watch(stores.client.isLoggedIn)`）

- 登出（loggedIn=false）：`clearContacts` + `clearGroups` + `clearPresence`；
- 登录后（loggedIn=true）：
  - `enableBlocklist && !blockListLoaded` → 拉黑名单（优先 `ds.fetchBlocklist`，否则 SDK
    `contactManager.getBlocklist()` 映射为 UiContact）；
  - `enableContact && ds.fetchContacts && !loaded` → **仅业务自定义数据源时**登录后立即拉好友；
  - 默认走 SDK 的场景**由 `onSyncDataFinished` 在数据同步完成后回填**——不要在登录后立即
    `getContacts()`，roster 同步前抢跑会拿到空列表并**锁定 loaded**，之后不再回填。

## 5. 延迟初始化（autoInit=false）

- setup 阶段不创建 SDK client；`ManagerHost` 代理把 domains 的访问运行时委托到
  `requireClient()`（未初始化时 throw `[UIKit] SDK 尚未初始化：请先调用 init(config)…`）；
- 业务侧 `useClient().init(config)`（内部 `createClient` + `registerEventHandlers` +
  `domains.userInfo.listen()`，可重复调用完成重新初始化）；
- **场景默认值自动补齐**：`init({ appKey })` 无需关心 managers / enableSyncData——
  场景包经 core provider 的 `resolveClientConfig` 钩子在 `setupClient` 统一注入
  （auto-init 与延迟初始化同一路径），业务显式传入时以业务配置为准；
- Domain 层在初始化前构建、初始化后正常工作，是延迟初始化的设计前提。

## 6. useUIKit() 与 UIKitContext

- `useUIKit()` 必须在 `<UIKitProvider>` 内 `inject`，外部调用 **throw**
  `useUIKit() must be used within <UIKitProvider>`；
- `UIKitContext` 字段：`client`（`Ref<ManagerHost>`，shallowRef 防 UnwrapRef 丢 SDK 私有字段）、
  `domains`（message/conversation/contact/group/presence/userInfo 六域）、`stores`（8 个）、
  `features` / `dataSource` / `h5` / `theme`（与 provider 共享同一 themeStore 实例）、
  `init` / `login`（accessToken 或密码）/ `logout`；
- `logout` 清理链：SDK logout → dispose 事件与 userInfo 订阅 → 七个 store 清理
  （clearClient / clearConversations / clearMessages / clearContacts / clearGroups /
  clearPresence / clearUserInfos）→ 模块级单例 `resetMultiSelectState()` +
  `clearAllDrafts()`（跨登录会话不残留）；
- 好友申请/群邀请持久化：provider 内用 `useInvitePersistenceInternal`（直接传 stores，避免
  provider 自身 inject 不命中），按登录用户 + appKey 隔离，仅保留 pending 状态。

## 7. 通知点击默认行为（与 skill `uikit-notification` 交叉）

- 默认 `onNotificationClick`：`window.focus()` → `navigateOnClick===false` 短路 → 找到会话 →
  `domains.conversation.enter(id, type)` + `sendChannelAck(id, type)`；
- 必须 enter（SDK setCurrentConversation + store 当前会话 + 补发已读回执）而非只
  setCurrentConversationId，否则 SDK 层不认当前会话，新消息未读数先增后清出现 1→0 闪烁；
- `sendChannelAck` 未读数 >0 时清服务端未读，0 时短路。

## 硬规则 vs 软约定

**硬规则：**

- features / dataSource 的修改必须经 Provider props（或 `useUIKitProvider` options），禁止在
  store 或组件里绕过开关硬开硬关能力。
- `useUIKit()` 只能在 `<UIKitProvider>` 内；provider 组件自身需要上下文时用
  `useUIKitProvider` 的返回值或 Internal 版本，禁止在自己内部 `useUIKit()`。
- 通知点击跳转必须走 `domains.conversation.enter` + `sendChannelAck`，禁止只改
  `currentConversationId`。
- 登录后好友列表拉取必须遵守「业务数据源立即拉 / SDK 默认等 onSyncDataFinished 回填」的分工，
  禁止统一改为登录后立即拉。
- 关闭 `enableToast` / `notification.enable` 后，业务自渲染必须复用 `useToast()` /
  `useNotification()` 单例状态，禁止另建一套状态。

**软约定：**

- 新增 enable 类开关需同步四处：`ProviderProps` 定义 + provider 的 features computed + `UIKitFeatures` 类型 + `defaultFeatures`（默认值按 Provider 保守原则取舍）。
- 延迟初始化只在你需要先拿 appKey（如异步从业务服务端换取）时使用；否则保持 autoInit 默认。

## 已知漂移（改到相关文件时注意）

- Provider `withDefaults` 与 `defaultFeatures` 值不一致是**设计**（Provider 保守默认 /
  库内兜底），不要「统一」成一致。
- `contactFetchMode: 'page'` 目前 SDK 未暴露分页游标接口，实际按全量返回处理——不要在
  dataSource 契约里假设 page 语义真的分页。
- `h5.fontScale` 与 `theme.fontSize` 是两条字号入口，fontScale 只是兼容通道（theme 显式指定后
  不再生效），不要扩展它的语义。

## 反面清单

- ❌ 组件里 `useUIKit()` 拿 `ctx.features.enablePresence` 当静态值缓存——开关运行时切换会失效。
- ❌ 在 `<UIKitProvider>` 外调用 `useUIKit()` 不处理 throw——直接崩。
- ❌ 默认 SDK 场景在登录后立即 `getContacts()`——roster 同步前抢跑拿空列表，loaded 被锁定。
- ❌ 通知点击只 `setCurrentConversationId`——SDK 层仍认为非当前会话，未读数 1→0 闪烁。
- ❌ 业务自绘 Toast/通知时新建全局 ref 存状态——必须复用 `useToast()` / `useNotification()` 单例。
- ❌ 在 provider 组件内部 `useUIKit()`——inject 无法命中当前组件，直接 throw。
- ❌ 关闭 `notification.enable` 后还期待 `EmNotificationContainer` 挂载——容器随开关卸载，
  但 `useNotification()` 状态仍在（单例）。
