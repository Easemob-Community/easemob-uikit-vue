# 更新日志

本页记录 Easemob UIKit Vue3 的所有重要变更。

::: tip 版本说明

- **重大版本**：包含破坏性变更，需要迁移
- **次要版本**：新增功能和优化，向下兼容
- **补丁版本**：问题修复，向下兼容

:::

## 1.4.0 (2026-08-05)

### 🚨 重大变更

#### 升级 `easemob-websdk` 至 `5.0.0`

本次升级适配了 SDK 5.0.0 的破坏性变更，主要影响：

- **移除已废弃 API**：`GroupManager.getPublicGroupList` 已移除
- **新增错误码**：错误码 222（单聊被拉黑）映射与多语言文案
- **语音消息格式**：调整为 WAV 格式并优化语音转文字参数透传
- **构建配置**：修复 `vite.config.ts` 中 SDK 版本读取，兼容新版包入口布局

::: details 迁移指南
详见 [`packages/migration-guide-0.14.227-to-0.18.3.md`](https://github.com/easemob/easemob-uikit-vue/blob/main/packages/migration-guide-0.14.227-to-0.18.3.md)
:::

### ✨ 新增功能

#### 图片消息三级展示优化

图片消息现在支持更精细的加载策略，优化首屏性能和用户体验：

- **气泡展示**：统一优先展示缩略图（最小图），点击展开中图，再点击原图按钮展示原图
- **预览层切换**：中图/原图切换入口统一为底部按钮，文案明确点击结果（"查看原图"/"查看中图"）
- **交互修复**：修复提示条与徽标点击穿透误关预览的问题（`pointer-events` 优先级）

#### 消息引用卡片增强

引用消息的视觉展示更加直观：

- 引用卡片去掉 emoji icon，图片/视频直接展示缩略图
- 无图时兜底中文标签（由中文方括号【】改为英文方括号 []）

#### 消息操作增强

右键/长按菜单支持更多操作：

- 附件消息支持下载
- 复制菜单仅对文本消息展示，避免误操作

#### 群公告展示优化

群公告在聊天页的展示更加突出：

- 群描述弱化 + 群公告突出（横幅/历史/发布者）
- 切换群聊会话时预拉群公告，避免必须展开抽屉才显示横幅
- 移除本地缓存的公告历史/发布者/时间（SDK 5.0.0 无历史接口）

#### ID 一键复制

全量支持 ID 一键复制能力，方便调试和问题排查。

#### Chat Header 优化

- 群聊标题支持成员数后缀
- 优化单聊/群聊对齐配置

#### 好友与群组事件通知

在聊天页插入中性灰色通知，展示好友申请、群组邀请等系统事件。

#### Plugin 扩展点补齐

新增多个扩展点，支持更灵活的业务定制：

- `input-panel`：输入面板扩展
- `message-action-extra`：消息操作扩展
- `custom-message-action`：自定义消息操作
- `useChatPlugin`：聊天插件组合式函数
- `lastMessageTextResolver`：支持自定义最后一条消息文本

Demo 增加快捷回复与名片选择示例。

#### Cell 组件增强

支持 `insetHover=false` 卡片内操作项模式，群管理入口与群主操作行统一收敛到 EmCell。

#### 国际化增强

- 新增 `findLocaleKey` 调试函数，支持单个/批量文案反查 locale key
- 支持 `mergeLocaleMessages` 扩展业务语言包
- 补齐名片消息多语言 key（sendCard/myCard/contactCard/noCardAvailable）

#### SDK 错误处理优化

- 基于 SDK error code 优化核心 toast 错误提示
- 使用 `isSDKError` + `formatSdkError` 统一 SDK 错误日志输出

#### 其他新增

- **字体统一**：在 `:root` 添加 `--uikit-font-family` 统一跨浏览器字体表现
- **邀请持久化增强**：修复通知入口不显示及默认值异常，增强邀请持久化与消息搜索能力
- **群已读回执**：点击会话批量补发群已读回执，统一置顶/引用展示链与按钮规范
- **UIKit 配置继承**：继承 SDK `deleteConversationOnGroupDestroyed` 初始化配置

### 🎨 优化

#### 群管理 UI 统一

- 群成员列表操作菜单改用 EmCell 卡片内操作项规范
- 群管理入口改用 action 按钮，与群管理操作视觉完全对齐
- 群管理入口 Cell 增加图标并与群管理操作样式对齐
- 群信息抽屉「群管理操作」更名为「群主操作」
- 移除群信息抽屉成员卡片的 hover 背景

#### 群成员列表优化

- 群成员二级列表卡片高度跟随内容，避免大面积留白
- 群聊抽屉二级成员列表外层卡片圆角与一级一致

#### 问题修复

- 修复语音消息群已读圆圈位置异常，将 `max-width` 从根元素移至气泡本身
- Demo 群聊 header 不再展示头像，与 UIKit 默认行为一致

### 📚 文档

- 新增 Demo 第一期 UIKIT 层能力评估规划文档
- 完善 VitePress 文档站与工程化细节
- 在图标页增加图标一览画廊，方便设计师查看全部内置图标
- 新增 ChatContainer Plugin 扩展点 Histoire story 文档
- 补全 VitePress 文档站点并修复 preview 启动失败

---

## 1.3.1 (2026-07-21)

### 变更

- 升级 `easemob-websdk` 至 `0.14.227`（本地包 `easemob-websdk-next-0.14.227.tgz`），迁移说明见 websdk2 仓库 `migration-guide-0.14.203-to-0.14.227.md`。
- 适配 SDK 0.14.224 事件行为变更：`recallMessage()` / `modifyMessage()` 成功后 SDK 不再在当前设备伪造 `onMessageRecalled` / `onMessageUpdated`，撤回与编辑改为在 await 成功后直接更新本地消息状态（`use-message-actions.ts`、`use-chat.ts`）；对端与多设备事件监听保持不变。
- 适配 SDK 0.14.223 事件行为变更：`pinMessage()` / `unpinMessage()` 成功后 SDK 不再在当前设备伪造 `onPinnedMessageChanged`，置顶操作后本地主动刷新置顶列表，保证 PinnedBar 同步（`use-message-actions.ts`）。

### 修复

- 适配 SDK 会话删除 API 变更：`DeleteConversationParams.deleteLocal` 已移除（SDK 删除会话成功后总会清理本地缓存）；`deleteConversationLocally` 已不存在，`removeConversation`（删除会话保留漫游消息）改为 `deleteConversation({ deleteRoamingMessages: false })` 并异步化（`conversation-domain.ts`、`use-conversation.ts`）。
- 适配 SDK 0.14.203 下载返回类型变更：群共享文件下载回调统一处理 `Blob | ArrayBuffer`，无 Blob 环境自动包装为 `Blob`（`group-domain.ts`）。

### 新增

- 群禁言列表项展示禁言到期时间（SDK 0.14.225 修复 v3 解析后返回 `muteExpire`）：永久 / 已到期 / 禁言至具体时间（`mute-list-item.vue`）。

---

## 1.3.0 (2026-07-07)

### 新增

- 接入 Presence 在线状态能力：
  - 新增 `PresenceDomain` 封装 SDK `PresenceManager` 的订阅、查询、发布能力。
  - 新增 `usePresence` 组合式函数，提供 `subscribePresence`、`fetchPresence`、`publishPresence`、`watch` 等 API。
  - 新增 `PresenceStore` 用于缓存在线状态，支持 `update` / `updateBatch` / `get`。
- 新增 Presence 相关组件：
  - `EmPresenceSelector`：在线状态选择器（在线 / 忙碌 / 离开 / 自定义）。
  - `EmPresenceSelectorModal`：弹窗形态的在线状态选择器，内部调用 `publishPresence`。
  - `EmPresenceAvatar`：传入 `userId` 即可自动订阅/拉取并展示在线状态，支持 `editable` 触发发布弹窗。
- `EmAvatar` 扩展：
  - 新增 `presence` prop，支持展示 `online` / `away` / `busy` / `offline` / `custom` 指示器。
  - 新增 `presenceSize` prop 自定义指示器尺寸。
  - 新增 `editable` prop 与 `presence-click` 事件，支持点击指示器触发状态编辑。
- 联系人/会话/群成员等列表组件接入在线状态展示：
  - `ContactList` / `ContactItem` / `ContactDetail` 支持在线状态点。
  - `ConversationList` / `ConversationItem` 单聊头像支持在线状态点。
  - `GroupMemberList` 支持懒加载可见成员的在线状态。
  - `UserCard` / `UserCardModal` 支持展示当前用户在线状态。
  - `MessageBubbleWrapper` 支持消息气泡头像展示发送者在线状态。
- 组件级 Presence 开关：
  - `ConversationContainer` / `ConversationList` 新增 `enablePresence` prop。
  - `ContactContainer` / `ContactListContainer` / `ContactList` 新增 `enablePresence` prop。
  - 优先级：组件 prop > Provider 全局 `features.enablePresence`。
- Provider 全局开关：
  - `UIKitProvider` 新增 `enablePresence` prop，默认 `false`。
  - `UIKitFeatures` 新增 `enablePresence`、`presenceStrangerMode`、`fetchGroupMemberPresenceOnVisible`。
- Demo 集成：
  - 默认开启 `enablePresence: true`。
  - 左侧导航栏顶部头像使用 `EmPresenceAvatar`，点击可发布在线状态。
- 新增 Histoire stories：
  - `Avatar` 新增 `Presence Sizes` variant。
  - 新增 `PresenceSelector`、`PresenceSelectorModal`、`PresenceAvatar` stories。
  - `ContactList` / `ConversationContainer` 新增 Presence 开启/关闭示例。

### 修复

- 修复 `Avatar` 方形模式下内部图片/文字缺少圆角的问题。
- 修复 `PresenceDomain.subscribe` / `fetchStatus` 成功后未写入 `PresenceStore` 的问题。
- 修复 `use-presence.ts` 中 `fetchPresence` 对 SDK `PresenceInfo.statusList` 的错误映射。
- 修复会话列表默认不主动获取在线状态的问题：进入会话列表时自动按可见单聊用户订阅 Presence。

---

## 早期版本

早期版本的更新记录请查看 [CHANGELOG.md](https://github.com/easemob/easemob-uikit-vue/blob/main/CHANGELOG.md) 文件。
