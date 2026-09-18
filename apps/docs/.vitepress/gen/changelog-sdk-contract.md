## @easemob/uikit-sdk-contract 1.3.0 (2026-09-18)


### 新增

- **`SdkMessageDomain` 新增 `removeMessages`**：删除当前用户的服务端漫游历史（本账号各端同步生效），补齐消息删除的契约面（双 adapter 实现见 websdk5 1.3.1 / webim4 1.3.1）。
- **`UiContactInvite` 新增 `outgoing` 字段**：标记「我发出的申请被对方拒绝」的通知方向，用于通知列表展示。

---

## @easemob/uikit-sdk-contract 1.2.1 (2026-09-17)


### 新增

- **`UIKitFeatures` 新增两个可选开关**：`showNicknameInSingleChat`（单聊消息列表是否展示对方昵称，默认 false）、`showNicknameInGroupChat`（群聊消息列表是否展示发送者昵称，默认 true）。

---

## @easemob/uikit-sdk-contract 1.2.0 (2026-09-03)


### 新增

- **被踢错误码契约**：`KICK_ERROR_CODE`（206 多端互踢 / 207 账号注销 / 214 设备数超限 / 216 修改密码 / 217 被其他设备踢下线，websdk 两代同码）与类型守卫 `isKickErrorCode()`。

---

## @easemob/uikit-sdk-contract 1.1.0 (2026-09-02)


### 新增

- **旁路持久化契约（D122 Phase 3.2/3.4 前置）**：新增入库 DTO `MessageRecord`（`SdkMessage` + 墓碑字段 `recalled`/`deleted`/`tombstoneTime`）与 `ConversationRecord`；新增清洗函数 `toMessageRecord`/`toConversationRecord`（纯 TS，剥离 File/Blob/函数、combine `messageList` 递归、`ext` 限深防循环引用）；新增 `SdkPersistenceHooks`（`message`/`conversation` 两域钩子，全部可选、fire-and-forget 语义）；`SdkConfig` 新增 `persistence` 槽（旁路写库，与 `repositories` 数据入口接管语义分立）。

---

## @easemob/uikit-sdk-contract 1.0.0 (2026-09-02)


### 新增

- **首次发布**：SDK 中立契约包——中立 wire 类型（`SdkMessage` / `UiMessage` / `UiConversation` / `UiGroup` / `UserInfo` 等）、常量、事件集、repository 数据入口接口、domains 业务域接口（Domain Port）、`SdkCapabilities` 能力矩阵（boolean 能力位 + `contractVersion` / `meta.reason` / `minContractVersion` 协商机制）、`SdkAdapter` 组合接口与初始化配置，及少量中立纯工具（logger / normalizeUserId / message-preview / stream-message）。零 SDK、零 UI 框架依赖。
