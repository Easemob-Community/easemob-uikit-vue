## @easemob/uikit-sdk-webim4 1.2.1 (2026-09-02)


### 修复

- **免打扰状态被会话回填冲掉**：`mergeIncomingConversations` 同 websdk5 1.2.1 口径，共有项保留本地 `isMuted`（回填项恒 false 不携带）；权威同步通道（`setMuted` 回写 / `patchMuteStates`）语义不变，回归测试同步补断言。

---

## @easemob/uikit-sdk-webim4 1.2.0 (2026-09-02)


### 新增

- **旁路写库钩子接线（与 websdk5 同构对齐）**：同一套 `persistence` 语义点按 4.x 事件模型接入（含 4.x 特有的 `onModifiedMessage` 编辑、`deleteRoaming` 多设备删除按会话粒度展开为消息 ID 集）。

### 修复

- **会话回填并集合并**：`applyServerItems`/注入路径 `refresh` 不再冲掉本地独有会话，共有项继承本地 `draft`/`draftTime`/`remindType`；顺带修复 4.x 收到 `deleteRoaming` 多设备删除事件时本地 store 未清理的问题。

---

## @easemob/uikit-sdk-webim4 1.1.0 (2026-09-02)


### 性能

- **用户资料拉取合批**：同 websdk5 1.1.0，4.x 侧同构对齐（底层走 `fetchUserInfoById`，attributes 经 wire 映射）。

### 破坏性行为变更

- **presence 独立运行默认关闭**：同 websdk5 1.1.0。

---

## @easemob/uikit-sdk-webim4 1.0.0 (2026-09-02)


### 新增

- **首次发布**：easemob-websdk 4.x（4.24.2，私有化）适配器——`Webim4Adapter`（内置 / 注入双模式）+ 六域 Domain + 单 `addEventHandler` 事件层归一化（批量 onMessage 逐条展开、read/delivery/channel 回执归一、流式增量、群事件 operation 分发）+ 字段/API 映射（合并/置顶/流式/已读回执全支持）+ 登录预取（对齐 5.x 同步体感）+ 漫游 pb 容错（坏消息跳过不拖垮整页）。4.x SDK 经 npm alias `easemob-websdk-4` 引入，与 5.x 同工程共存互不干扰。
