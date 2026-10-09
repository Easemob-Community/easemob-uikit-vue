## @easemob-community/uikit-sdk-websdk5 1.5.0 (2026-10-09)


### 新增

- **支持 App ID 初始化（SDK 5.1+）**：`SdkConfig.appKey` 与 `appId` 二选一，两者都未提供且非注入模式时 init 明确报错；`adapterConfig` 透传槽中的身份字段剥离，以契约顶层为准。
- **支持自定义登录超时（SDK 5.1.2+）**：`SdkConfig.loginTimeoutMs` 透传至 `login({ userId, token, timeoutMs })`，缺省走 SDK 默认 30s。

---

## @easemob-community/uikit-sdk-websdk5 1.4.0 (2026-10-09)


### 新增

- **SDK 日志捕获接入官方 `onLog` 通道（SDK 5.1+）**：`sdk-log-capture` 探测链新增最高优先级分支——检测到 SDK 根导出 `LogEventName` 且 client 单例已初始化时，经 `addEventHandler` 注册 `onLog` 回调，接收 SDK 已脱敏的结构化日志（timestamp/level/message/args），不再依赖 console 拦截；旧版 SDK（5.0.x）或未初始化场景自动回退原有 console patch 方案。探测链优先级：onLog > setLogger 注入 > console 拦截。

### 适配 easemob-websdk 5.1.x

- **`ClientConfig` 适配 `InitConfig` 联合类型**：SDK 5.1 起 `InitConfig` 变为 `appKey / appId` 二选一联合，`ClientConfig` 由 interface extends 改为交叉类型，单例一致性校验同时比对 `appKey` / `appId`；`adapterConfig` 透传槽剥离 `appId`（中立契约 `SdkConfig.appKey` 仍为必填，App ID 初始化的契约支持另行评估）。

---

## @easemob-community/uikit-sdk-websdk5 1.3.4 (2026-09-21)


### 修复

- **`currentUser` 记账提前到 login 发起前**：SDK 连接建立瞬间即可推送消息（典型：服务端 REST 下发的欢迎语在 login resolve 前经 `onMessage` 到达），此前 `setCurrentUser` 在 `await login()` resolve 后才执行，窗口期内 `toUiMessage` 打 `currentUserId is empty` 告警且 `isSelf` / 自动清未读 / @我 / 通知过滤不可靠；现同步提前记账、失败回滚清空。

---

## @easemob-community/uikit-sdk-websdk5 1.3.3 (2026-09-21)


### 新增

- **`enableReadReceipt` 能力开关落地**：`onMessage` 实时回执（`queueMessageReadReceipt`）与进入会话补发（`sendPendingReadReceipts` 钩子）在开关关闭时整体跳过，不再调用 `sendMessageReadReceipts`。

---

## @easemob-community/uikit-sdk-websdk5 1.3.2 (2026-09-20)


### 新增

- **联系人关系变更全局通知**：通知引擎新增 `notifyContactEvent`，`onContactRefuse`（我发出的好友申请被对方拒绝）与 `onContactDeleted`（被好友删除）除既有 store 写入 / 会话内通知外，同时投递全局通知（页内右上角弹窗 / 页面隐藏时浏览器系统通知优先、失败降级页内）。好友关系变更属低频高优事件，跳过免打扰 / 当前会话 / triggerMode 判定，仅尊重通知总开关；送达回调通道语义与消息通知一致。

---

## @easemob-community/uikit-sdk-websdk5 1.3.1 (2026-09-18)


### 新增

- **实现契约 `removeMessages`**：透传 SDK `chatManager.removeHistoryMessages` 删除服务端漫游历史，成功后触发 `persistence.message.deleteMessages` 删除墓碑（多端移除事件路径另有落库）。

### 修复

- **`onContactRefuse` 补「我发出的申请被对方拒绝」通知**：无本地 pending 申请时落一条 `outgoing: true` 的拒绝通知，UI 展示「拒绝了你的好友申请」。

---

## @easemob-community/uikit-sdk-websdk5 1.3.0 (2026-09-16)


### 变更

- **`getDefaultFeatures()` 的 `enablePresence` 默认由 `false` 改为 `true`**：adapter 独立运行或未传 features 时与 UIKit Provider 3.6.0 默认对齐（在线状态为产品化默认形态）；注意订阅/查询会带来额外请求，低频场景应显式关闭。

---

## @easemob-community/uikit-sdk-websdk5 1.2.2 (2026-09-03)


### 新增

- **语音未播放打标**：`onMessage` 实时收到对方语音消息时调用 `stores.message.markVoiceUnplayed?.(msgId)`（`MessageStoreLike` 新增可选方法，chatroom 等场景 store 可缺省），支撑 UI 层语音未读红点；历史/漫游路径不打标。

### 修复

- **被踢误报网络异常**：`onDisconnected` 按错误码识别被踢/账号失效（取 `payload.errorCode`），命中 `KICK_ERROR_CODE` 时调用 `client.setKicked(code)` 标记账号终态，而非仅置 disconnected；内置 client store 的 `EventStores` 结构补 `setKicked`；新增 `connection-events` 回归测试。

---

## @easemob-community/uikit-sdk-websdk5 1.2.1 (2026-09-02)


### 修复

- **免打扰状态被会话快照冲掉**：`mergeWithExistingConversations` 合并重叠会话时 `isMuted` / `remindType` 以本地为准（SDK 会话快照恒 DEFAULT 不携带该状态），修复设置/解除免打扰后来新消息即被重置的问题；权威同步通道（`setMuted` 回写 / `CONVERSATION_MUTE_INFO_CHANGED` / `patchConversationMuteStates`）语义不变，合并回归测试补 `isMuted` 保留断言。

---

## @easemob-community/uikit-sdk-websdk5 1.2.0 (2026-09-02)


### 新增

- **旁路写库钩子接线**：发送成功 / SDK 漫游回流 / 收消息 / 撤回（含本端主动撤回即落墓碑）/ 编辑 / 送达与单聊已读回执 / 多设备删除 / 会话列表回填，逐点触发 `persistence` 钩子（fire-and-forget，失败仅告警不阻塞）；repository 注入路径（数据来自本地库）不写回；流式分片不落库（完整消息经 onMessage/漫游路径落库）。

### 修复

- **会话覆盖竞争（D122 3.3）**：`mergeWithExistingConversations` 升级为并集合并——本地独有会话（如 DB 预填）不再被 SDK 快照冲掉，重叠会话保留本地 `draft`/`draftTime`/`remindType` 字段；`patch.removed` 显式删除通道不受影响。

---

## @easemob-community/uikit-sdk-websdk5 1.1.0 (2026-09-02)


### 性能

- **用户资料拉取合批**：`fetchUserInfos` 同 tick 多次调用经微任务合并为一次底层请求（userIds 去重、attributes 取并集），消除大列表首渲染 N+1；防重与失败标记语义不变。

### 破坏性行为变更

- **presence 独立运行默认关闭**：`getDefaultFeatures()` 的 `enablePresence` 由 `true` 改为 `false`——adapter 独立运行或未传 features 时不再默认启用在线状态，仅 Provider 显式 `enablePresence` 开启才启用（Provider 路径默认本为 false，无影响）。

---

## @easemob-community/uikit-sdk-websdk5 1.0.0 (2026-09-02)


### 新增

- **首次发布**：easemob-websdk 5.x 适配器——`Websdk5Adapter`（内置 / 注入双模式）+ 六域 Domain（message/conversation/contact/group/presence/userInfo）+ 事件层 + 中立字段映射 + 六 repository 代理 + 新消息通知引擎，实现 `@easemob-community/uikit-sdk-contract` 全部接口；`SdkRepositoryOverrides` 全域可注入。
