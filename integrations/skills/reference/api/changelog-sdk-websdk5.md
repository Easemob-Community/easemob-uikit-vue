## @easemob-community/uikit-sdk-websdk5 1.2.2 (2026-09-03)


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
