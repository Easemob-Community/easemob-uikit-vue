## @easemob/uikit-sdk-contract 1.0.0 (2026-09-02)


### 新增

- **首次发布**：SDK 中立契约包——中立 wire 类型（`SdkMessage` / `UiMessage` / `UiConversation` / `UiGroup` / `UserInfo` 等）、常量、事件集、repository 数据入口接口、domains 业务域接口（Domain Port）、`SdkCapabilities` 能力矩阵（boolean 能力位 + `contractVersion` / `meta.reason` / `minContractVersion` 协商机制）、`SdkAdapter` 组合接口与初始化配置，及少量中立纯工具（logger / normalizeUserId / message-preview / stream-message）。零 SDK、零 UI 框架依赖。
