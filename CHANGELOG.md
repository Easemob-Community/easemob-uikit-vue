# Changelog

## 1.2.0 (2026-07-04)

### 新增

- 新增群成员列表组件 `GroupMemberList`（公开名 `EmGroupMemberList`）：
  - 支持搜索、分页加载、角色标签（群主/管理员/成员）。
  - 支持对成员发起单聊、移除成员、设置/取消管理员（按当前用户角色自动判断权限）。
  - 通过 `Chat.vue` 的「查看全部成员」入口承接群信息抽屉，打开右侧抽屉展示成员列表。
- `Chat.vue` 新增 `showMemberList` 状态与成员列表抽屉，点击群信息抽屉的「查看全部成员」后可直接打开 `GroupMemberList`。
- `GroupDomain` / `useGroup` 新增群管理员能力：
  - `addGroupAdmin(groupId, userId)` / `removeGroupAdmin(groupId, userId)`
  - 操作成功后同步更新 `GroupStore` 中对应成员角色。
- `GroupStore` 新增 `updateGroupMemberRole(groupId, userId, role)`，用于本地即时更新成员角色。
- 新增好友申请通知列表组件 `ContactNoticeList`（公开名 `EmContactNoticeList`）：
  - 同时支持**好友申请**与**群组邀请**两种通知类型。
  - 针对已加入的群组或已成为好友的待处理邀请，会按「已接受」展示，避免无效操作。
  - 支持接受 / 拒绝操作，好友申请调用 `ContactManager`，群邀请调用 `GroupManager`。
  - 优化 item hover 与按钮边界：拒绝按钮使用白底描边，hover 时保持可见边界。
- `UiContactInvite` 类型扩展：新增 `id`、`type`、`groupId`、`groupName`、`inviterId`、`inviterName` 字段，统一描述好友申请与群组邀请。
- `ContactStore` 新增 `inviteList` 缓存与 `addInvite / removeInvite / updateInviteStatus / clearInvites` 方法，并新增 `pendingCount` 计算属性。
- `ContactDomain` 与 `contact-events.ts` 扩展好友申请事件处理：
  - `onContactInvited` 将申请存入 `inviteList`；若对方已是好友，则直接标记为 `accepted`。
  - `onContactAgreed` / `onContactRefuse` / `onContactAdded` / `onContactDeleted` 同步联系人及申请状态。
- `GroupDomain` / `useGroup` 新增群邀请处理能力：
  - `acceptGroupInvitation(groupId)` / `declineGroupInvitation(groupId)`
- `group-events.ts` 新增群邀请事件处理：
  - `onInvitationReceived` / `onInvitationAccepted` / `onInvitationDeclined` / `onAutoAcceptInvitationFromGroup` / `onMembersJoined` 自动维护 `inviteList` 状态。
- `ContactNoticeList` 新增 `persist` 配置：
  - `persist` 支持 `true` / 'local' / 'session'，开启后未处理通知自动持久化，刷新页面后仍可恢复。
- `AddressBookContainer` 新增 `noticePersistInvites` 配置：
  - 在容器层统一开启通知持久化，确保首页「通知」hot 红点在刷新后也能立即显示，无需先打开通知列表。
- 新增 `useInvitePersistence` 组合式函数，基于 `appKey + userId` 生成隔离存储 key，恢复时自动过滤已接受 / 已加入的邀请。
- `AddressBookContainer` 默认通知视图：
  - 通知徽标数未传入时自动取 **pending 数量**（`pendingCount`），仅统计未处理的好友申请与群邀请。
  - 「通知」入口徽标使用 **hot 红点徽章**（红底白字圆点），联系人 / 群组入口保持原有默认数字样式。
  - 徽标数字超过 99 显示 `99+`。
  - `notice` 视图默认渲染 `ContactNoticeList`，业务仍可通过 `#notice` 插槽覆盖。
- 群聊输入框 @提及自动调起群内成员列表：
  - `Chat.vue` 在群聊会话下自动预加载群成员（本地为空时拉取第一页）。
  - 将当前群成员（排除自己）映射为 `MentionContact[]` 透传给 `MessageInput`。
  - `MessageInput` 新增 `mentionContacts` prop，传入后优先于 `config.input.mention.contacts` 使用。
  - 用户输入 `@` 时，`MentionPicker` 现在能展示群内成员并支持搜索、选中。
- 群信息抽屉「添加成员」按钮按群组邀请权限动态显示：
  - 群主/管理员始终显示。
  - 普通成员仅在 `group.allowInvites === true` 时显示。
  - 无权限时不展示按钮，避免触发 403。
- 邀请失败时增加 `group.inviteMember.forbidden` 文案：遇到 `forbidden` / `access forbidden` 错误提示「当前群组不允许邀请成员，请联系群主或管理员」。
- 群信息抽屉「添加成员」按钮样式修复：增加 `justify-content: center`、`line-height: 1` 与水平 padding，解决文案/图标不居中的问题。
- 新增 `InviteMemberModal` 组件，实现从联系人列表选择并邀请成员入群：
  - 邀请弹窗内联系人列表关闭字母导航与分组标题，改为平铺列表，避免右侧字母条溢出/挤压弹窗。

  - 弹窗居中展示（移动端底部抽屉），支持多选联系人。
  - 已在群中的成员和当前登录用户自动禁用，避免重复邀请。
  - 支持搜索联系人，底部显示「取消 / 邀请」按钮。
  - `Chat.vue` 在群信息抽屉点击「添加成员」时打开该弹窗，邀请成功后提示并刷新成员列表。
- `GroupMemberList` 新增 `allow-chat` 配置（`'all' | 'contact' | 'none'`）：
  - `'all'`：对所有成员（除自己外）显示「发消息」按钮。
  - `'contact'`：仅对联系人列表中的成员显示「发消息」按钮。
  - `'none'`：不显示「发消息」按钮。
  - `ChatConfig` 新增 `groupMember.allowChat`，`Chat.vue` 会自动透传给成员列表弹窗。
- 新增 `GroupMemberList` Storybook 示例：「仅联系人可发消息」与「禁止发消息」。
- 新增 `contact.*` 与 `group.memberList.*` 系列国际化文案（好友申请、群邀请、群成员列表、管理员操作等）。
- 新增 `ContactNoticeList`、`GroupMemberList` 与 `AddressBookContainer` 的 Storybook 示例。

### 优化

- 群信息抽屉的成员预览区交互升级：
  - 点击成员头像区域或「查看全部成员」按钮，改为居中 Modal 弹窗展示完整成员列表，避免抽屉套抽屉。
  - `GroupMemberList` 新增 `closable` 属性与 `close` 事件，支持在弹窗标题栏显示关闭按钮。
  - 弹窗宽度 480px、高度 70vh（移动端 90vw×80vh），内部列表独立滚动，保留搜索、角色标签、发消息/设管理员/移除等操作。

### 修复

- 修复会话列表切换/更新时名称先显示 ID 再显示名称的闪烁问题：
  - `onConversationListUpdate` 改为合并更新，优先保留本地已补全的名称/头像，避免 SDK 把 `conversationName` 回退成 `conversationId`。
  - `onSyncDataFinished` 的 conversation 分支也使用合并策略保留已补全名称。
- 修复会话列表中群聊只显示群组 ID 的问题：
  - 在 `onSyncDataFinished`（conversation / contact / group）和 `onConversationListUpdate` 之后，使用群组列表、联系人备注/名称、用户资料昵称补全会话名称。
  - 若本地没有对应群组信息，会主动调用 `groupManager.getGroupInfoList` 拉取群详情，进一步兜底补全群名称。
- 修复会话列表搜索不支持中文备注 / 群名 / 昵称的问题：
  - 默认搜索现在会同时匹配会话 ID、会话名、最后一条消息、单聊联系人备注/名称/用户资料昵称、群聊群名称。
  - 仍可通过 `filterFn` 自定义搜索逻辑。
- 修复发送视频消息失败的问题：
  - 原实现调用 `sendVideoMessage(file, 0, ...)` 时 duration 为 0，触发 websdk2 `ValidationError: duration must be positive`。
  - 现在通过 `<video>` 元素读取本地视频真实时长，读取失败时兜底为 1 秒，确保 duration 始终为正整数。

## 1.1.3 (2026-07-03)

### 新增

- 群信息抽屉（`ChatInfoDrawer`）从 mock 数据升级为真实群信息入口：
  - 展示群名称、头像、描述、公告、成员数。
  - 拉取并展示群成员列表（首页），区分群主/管理员/普通成员角色。
  - 提供「清空聊天记录」「退出群聊」「解散群聊（仅群主）」操作，并带二次确认弹窗。
  - 预留「查看全部成员」「添加成员」事件入口，下一期可接入群成员管理。
- `GroupDomain` / `useGroup` 新增群成员、群公告、转让群主、移除成员、邀请入群能力：
  - `fetchGroupMembers` / `fetchGroupAnnouncement` / `updateGroupAnnouncement`
  - `changeGroupOwner` / `removeGroupMembers` / `inviteUsersToGroup`
- `GroupStore` 新增群成员与群公告缓存，`group-events.ts` 事件已可自动同步更新。
- `ConversationDomain` / `useConversation` 新增 `clearChatHistory`，支持清空本地聊天记录并可选删除服务端漫游消息。
- `MessageStore` 新增 `clearConversationMessages` 用于清理指定会话本地消息缓存。
- 新增 `UiGroupMember` 类型与 `toUiGroupMember` 适配器。
- 新增 `chat.info.*` 系列国际化文案（群公告、群介绍、群主、管理员、成员、查看全部成员、添加成员、清空/退出/解散群聊等）。
- 新增 `ChatInfoDrawer` Storybook 示例（Group / SingleChat 两种 Variant）。

## 1.1.2 (2026-07-02)

### 新增

- `UIKitProvider` 新增 `enableUserInfo` 与 `enableUserInfoSubscription` props，业务可显式控制用户资料展示与陌生人资料变更订阅。
  - `enableUserInfo`：是否启用自动拉取/展示用户资料（昵称/头像），默认 `true`。
  - `enableUserInfoSubscription`：是否启用陌生人资料变更订阅，默认 `true`；服务端未开通时自动熔断并提示。
- 用户资料订阅无权限或服务未开通时，UIKIT 现在会通过内置 Toast 提示用户：
  - 中文："用户资料实时订阅未开通，陌生人资料变更不会自动更新，请联系管理员开通"。
  - 英文："User profile real-time subscription is not enabled. Stranger profile changes will not update automatically. Please contact the admin."。
  - 提示仅触发一次，避免刷屏。
- 撤回消息失败时增加分类 Toast 提示：
  - `message recall disabled` / 服务未开通：提示"消息撤回功能未开通，请联系管理员开通"。
  - 超过可撤回时间：提示"已超过可撤回时间，无法撤回"。
  - 其他失败：提示"撤回失败，请稍后重试"。
  - 失败仍会通过 `recall-failed` 事件透传，业务层可继续自定义处理。

### 文档

- 为 `UIKitProvider` Storybook 补充用户资料订阅配置示例（开启 / 关闭订阅两种 Variant）。

## 1.1.1 (2026-07-02)

### 新增

- 新增 `useOwnUserInfo()` 组合式函数，外层业务可方便地获取当前登录用户自己的昵称/头像：`const { userInfo, displayName, avatarUrl } = useOwnUserInfo()`。
  - 自动拉取当前用户资料并复用 UIKit 内部缓存。
  - 不调用陌生人资料订阅，避免在 demo 等未开通订阅权限的环境下产生额外请求。

### 修复

- 修复用户资料订阅在服务端未开通/无权限时产生大量 403 控制台警告的问题。
  - `UserInfoDomain.subscribeUserInfos` 现在会合并同一事件循环内的订阅请求，减少并发。
  - 检测到 `code === 210` / `httpStatus === 403` / `reason === 'service_forbidden'` 时自动熔断，后续不再发起订阅请求。
  - 失败用户 ID 会被缓存，避免反复重试；权限类错误仅 warn 一次，避免刷屏。
  - 新增 `UIKitFeatures.enableUserInfoSubscription` 开关，业务可主动关闭订阅。
- 修复聊天信息抽屉中备注编辑未接入 SDK 的问题。
  - 点击保存后调用 `contactManager.setContactRemark` 同步到服务端。
  - 备注保存成功后抽屉内名称、联系人列表、聊天 header、会话列表、消息气泡等使用 `remark` 的位置会自动刷新。
  - 修复联系人 store 备注更新未触发响应式的问题（`updateContactRemark` 改为生成新对象并替换数组项）。
  - 保存过程中按钮禁用并显示“保存中...”。
  - 新增 `chat.info.remarkSaveFailed` / `chat.info.saving` 国际化文案。
- 统一 UIKit 内用户昵称/头像展示优先级：
  - 单聊场景下统一按 **联系人备注（remark）> 用户资料昵称/头像（UserInfo）> 业务兜底名称/头像（会话/消息自带）> 用户 ID** 的顺序展示。
  - `useUserInfo()` 与 `useOwnUserInfo()` 的 `displayName` / `avatarUrl` 已纳入 `contact.remark` / `contact.avatar`。
  - 已覆盖位置：会话列表（`conversation-item`）、聊天窗口顶部 header（`chat`）、消息气泡发送者（`message-bubble-wrapper`）、聊天信息抽屉（`chat-info-drawer`）。
  - 群聊仍使用会话自身名称/头像，不受单聊资料优先级影响。

## 1.1.0 (2026-07-01)

### 新增

- H5 适配核心能力：新增 `useH5Adaptation()` 与 `UIKitProvider` 的 `h5` 配置，集中管理 viewport、安全区、软键盘高度、下拉刷新开关与字号缩放预留。
- 安全区接入：自动为 `chat-container`、`chat` header、`address-book-container` header/footer、`popup` bottom、`scroll-to-top`、`message-input` emoji sheet、`conversation-list` header/footer 增加安全区内边距。
- 键盘适配：`chat` 输入框 focus 时自动滚动消息列表到底部，避免软键盘遮挡最新消息。
- 下拉刷新：`<UIKitProvider :h5="{ pullRefresh: 'auto' }">` 可在触屏设备上自动开启。
- 长按交互：`useLongPress` 统一改用 vueuse `onLongPress`，增加 touchmove 阈值与长按时禁止 body 滚动，解决 H5 长按与页面滚动冲突。
- 动画 token 接入：`message-input` emoji sheet 等 H5 高频路径的过渡时长改接 `--uikit-anim-*` CSS 变量。

### 文档

- 新增 [H5 适配指南](apps/docs/guide/h5-adaptation.md)。
- 更新根 `README.md`、`apps/docs/index.md` 与 `apps/docs/.vitepress/config.ts`。
- 新增 `.agent/skills/uikit-h5-adaptation/SKILL.md`，并更新 `AGENTS.md`、相关 skill 与 `TECH-DEBT.md`。
