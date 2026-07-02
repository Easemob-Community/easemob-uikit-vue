# Vue3 UIKit 单人与群组功能实现指南

> 命中本 skill 时，先说一句：`本次命中 skill: uikit-contact-group-capabilities`。

## 触发词

- `单人功能` / `联系人功能` / `好友功能`
- `群组功能` / `群管理` / `群成员` / `群设置`
- `通讯录功能` / `address book`
- `实现联系人/群组模块`
- `websdk2 单人/群组 API 能力`

## 目标

本 skill 汇总 `websdk2` 已暴露的 **单人（联系人/好友）** 与 **群组** 相关公开 API，并给出在 `packages/uikit` 中补全 UI/业务层的实现建议，方便按优先级指挥 AI 分模块实现。

> 边界：本 skill 只关注 **ContactManager / GroupManager / UserInfoManager** 中与人、群关系直接相关的 API。消息收发、会话管理、聊天室、Thread、Presence 等能力由其他 skill 覆盖。

---

## 一、websdk2 单人能力清单

管理器：`client.contactManager`、`client.userInfoManager`

### 1.1 联系人关系（ContactManager）

| 能力 | SDK API | 当前 UIKit Domain 状态 | 建议 UI 层补充 |
|---|---|---|---|
| 读取本地联系人快照 | `getContacts()` | ✅ `ContactDomain.syncLocal()` | 通讯录列表、联系人选择器 |
| 添加好友（发送申请） | `addContact({ userId, message })` | ✅ `ContactDomain.addContact()` | 添加好友弹窗/页面 |
| 删除好友 | `deleteContact({ userId })` | ✅ `ContactDomain.deleteContact()` | 联系人详情删除按钮 |
| 接受好友申请 | `acceptContactInvite({ userId })` | ✅ `ContactDomain.acceptInvite()` | 好友申请通知列表 |
| 拒绝好友申请 | `declineContactInvite({ userId })` | ✅ `ContactDomain.declineInvite()` | 好友申请通知列表 |
| 设置/清空备注 | `setContactRemark({ userId, remark })` | ✅ `ContactDomain.setRemark()` | 聊天信息抽屉备注编辑（已做） |
| 获取黑名单 | `getBlocklist()` | ✅ `ContactDomain.syncBlocklist()` | 黑名单管理页 |
| 批量加入黑名单 | `addUsersToBlocklist({ userIds })` | ✅ `ContactDomain.addToBlocklist()` | 联系人长按/详情菜单 |
| 批量移出黑名单 | `removeUserFromBlocklist({ userIds })` | ✅ `ContactDomain.removeFromBlocklist()` | 黑名单管理页 |
| 事件监听 | `addEventHandler / removeEventHandler` | ✅ `sdk/event/contact-events.ts` 已注册 | 按需消费事件刷新 UI |

### 1.2 用户资料（UserInfoManager）

| 能力 | SDK API | 当前 UIKit Domain 状态 | 建议 UI 层补充 |
|---|---|---|---|
| 按用户 ID 批量查询资料 | `getUserInfoByUserId({ userIds })` | ✅ `UserInfoDomain.fetchUserInfos()` | 消息气泡、会话列表、联系人列表头像昵称 |
| 按属性集查询资料 | `getUserInfoByAttribute({ userIds, attributes })` | ❌ 未直接暴露 | 若需要只查部分字段可封装 |
| 订阅陌生人资料变更 | `subscribeUsersInfo({ userIds })` | ✅ `UserInfoDomain.subscribeUserInfos()` | 由 `useUserInfo()` 自动触发 |
| 取消订阅 | `unsubscribeUsersInfo({ userIds })` | ❌ 未封装 | 登出/离开页面时可选清理 |
| 查询已订阅列表 | `getSubscribedUsers()` | ❌ 未封装 | 调试/管理页面可用 |
| 更新当前用户资料 | `updateOwnInfo(params)` | ✅ `UserInfoDomain.updateOwnInfo()` | 个人资料编辑页 |
| 更新单个资料属性 | `updateOwnInfoByAttribute(attr, value)` | ❌ 未封装 | 可合并到 `updateOwnInfo` 中 |
| 事件监听 | `addEventHandler / removeEventHandler` | ✅ `UserInfoDomain.listen()` 已注册 | 已同步到 store |

### 1.3 单人能力事件总览

ContactManager 事件（`sdk/event/contact-events.ts` 已接入）：

- `onContactAdded` — 被添加为好友
- `onContactDeleted` — 被删除好友
- `onContactInvited` — 收到好友申请
- `onContactAgreed` — 对方同意好友申请
- `onContactRefused` — 对方拒绝好友申请
- `onContactUpdated` — 联系人资料更新（含备注）

UserInfoManager 事件：

- `onOwnInfoUpdated` — 当前用户资料更新
- `onUserInfoUpdated` — 订阅的陌生人资料更新

---

## 二、websdk2 群组能力清单

管理器：`client.groupManager`

### 2.1 群管理（GroupManager 顶层 API）

| 能力 | SDK API | 当前 UIKit Domain 状态 | 建议 UI 层补充 |
|---|---|---|---|
| 读取本地已加入群列表 | `getJoinedGroupList()` | ✅ `GroupDomain.syncLocal()` | 群组列表页 |
| 创建群组 | `createGroup({ name, description, memberIds, public, joinApprovalRequired, allowInvites, inviteNeedConfirm, maxMembers })` | ✅ `GroupDomain.createGroup()` | 创建群页面 |
| 加入群组 | `joinGroup({ groupId, message })` | ✅ `GroupDomain.joinGroup()` | 公开群搜索加入 |
| 退出/解散群组 | `leaveGroup / destroyGroup` | ✅ `GroupDomain.leaveGroup/destroyGroup()` | 群信息抽屉 |
| 获取单个群详情 | `getGroupInfo({ groupId })` | ✅ `GroupDomain.fetchGroupInfo()` | 群信息抽屉 |
| 批量获取群详情 | `getGroupInfoList({ groupIds })` | ✅ `GroupDomain.fetchGroupInfoList()` | 批量刷新 |
| 获取公开群列表 | `getPublicGroupList({ cursor, pageSize, needAffiliations })` | ❌ 未封装 | 公开群发现页 |
| 邀请用户入群 | `inviteUsersToGroup({ groupId, userIds })` | ❌ 未封装 | 邀请好友入群 |
| 同意/拒绝入群邀请 | `acceptInvitation / rejectInvitation` | ❌ 未封装 | 群邀请通知列表 |
| 同意/拒绝入群申请 | `acceptGroupJoinRequest / rejectGroupJoinRequest` | ❌ 未封装 | 群主/管理员审批列表 |

### 2.2 单群对象（GroupManager.getGroup(groupId)）

推荐通过 `client.groupManager.getGroup(groupId)` 获取单群对象操作，当前 UIKit 未对 `Group` 对象做二次封装。

| 能力 | SDK API（单群对象） | 当前 UIKit 状态 | 建议补充 |
|---|---|---|---|
| 获取本地轻量摘要 | `group.getSummary()` | ❌ 未封装 | 群列表项展示 |
| 获取/刷新群详情 | `group.getDetail() / refresh()` | ❌ 未封装 | 群信息抽屉 |
| 更新群资料 | `group.updateInfo({ name, description, avatarUrl, ext })` | ❌ 未封装 | 群资料编辑 |
| 更新群配置 | `group.updateConfigs({ public, maxMembers, allowInvites, inviteNeedConfirm, joinApprovalRequired, needVerify })` | ❌ 未封装 | 群设置页 |
| 转让群主 | `group.changeOwner({ newOwner })` | ❌ 未封装 | 群管理 |
| 解散/退出 | `group.destroy() / leave()` | ❌ 未封装（Domain 已做顶层） | 可复用 Domain |
| 分页获取成员 | `group.getMembers({ pageSize, cursor })` | ❌ 未封装 | 群成员列表 |
| 移除成员 | `group.removeMembers({ userIds })` | ❌ 未封装 | 群成员管理 |
| 获取管理员 | `group.getAdmins()` | ❌ 未封装 | 群管理 |
| 添加/移除管理员 | `group.addAdmin / removeAdmin` | ❌ 未封装 | 群管理 |
| 获取禁言列表 | `group.getMuteList({ pageSize, cursor })` | ❌ 未封装 | 群禁言管理 |
| 禁言/解除禁言成员 | `group.muteMembers / unmuteMembers` | ❌ 未封装 | 群禁言管理 |
| 全员禁言开关 | `group.muteAllMembers / unmuteAllMembers` | ❌ 未封装 | 群设置 |
| 获取黑名单 | `group.getBlocklist({ pageSize, cursor })` | ❌ 未封装 | 群黑名单管理 |
| 拉黑/移出成员 | `group.blockMembers / unblockMembers` | ❌ 未封装 | 群黑名单管理 |
| 获取白名单 | `group.getAllowlist()` | ❌ 未封装 | 群白名单管理 |
| 添加/移除白名单 | `group.addUsersToAllowlist / removeUsersFromAllowlist` | ❌ 未封装 | 群白名单管理 |
| 查询自己在白/禁言列表 | `group.checkIfInAllowList / checkIfInMuteList` | ❌ 未封装 | 输入框权限判断 |
| 获取/更新群公告 | `group.getAnnouncement / updateAnnouncement` | ❌ 未封装 | 群公告组件 |
| 获取共享文件 | `group.getSharedFileList` | ❌ 未封装 | 群文件 |
| 上传/删除/下载共享文件 | `group.uploadSharedFile / deleteSharedFile / downloadSharedFile` | ❌ 未封装 | 群文件 |
| 设置/获取成员属性 | `group.setMemberAttributes / getMembersAttributes` | ❌ 未封装 | 群名片 |

### 2.3 群组事件总览

`GroupManager` 事件（`sdk/event/group-events.ts` 已接入）：

- `INVITATION_RECEIVED` / `INVITATION_ACCEPTED` / `INVITATION_DECLINED` — 群邀请
- `REQUEST_TO_JOIN_RECEIVED` / `REQUEST_TO_JOIN_ACCEPTED` / `REQUEST_TO_JOIN_DECLINED` — 入群申请
- `AUTO_ACCEPT_INVITATION` — 自动同意邀请
- `MEMBERS_JOINED` / `MEMBERS_EXITED` — 成员进出
- `USER_REMOVED` — 被移出群
- `GROUP_DESTROYED` — 群被解散
- `OWNER_CHANGED` — 群主变更
- `ADMIN_ADDED` / `ADMIN_REMOVED` — 管理员变更
- `MUTE_LIST_ADDED` / `MUTE_LIST_REMOVED` — 禁言列表变更
- `ALLOW_LIST_ADDED` / `ALLOW_LIST_REMOVED` — 白名单变更
- `ALL_MEMBER_MUTE_STATE_CHANGED` — 全员禁言变更
- `ANNOUNCEMENT_CHANGED` — 群公告变更
- `SHARED_FILE_ADDED` / `SHARED_FILE_DELETED` — 群文件变更
- `GROUP_INFO_CHANGED` / `GROUP_DISABLED_CHANGED` — 群资料变更
- `GROUP_MEMBER_ATTRIBUTE_CHANGED` / `USER_GROUP_NAMECARD_UPDATED` — 群名片变更

---

## 三、UIKit 当前实现状态

### 3.1 已落地

- **联系人**
  - `ContactDomain` 已封装联系人关系读写与黑名单。
  - `useContact()` 已暴露列表/选择/刷新/加删好友/黑名单/备注能力。
  - `contact-list` 组件已支持搜索、分组、字母导航、选择模式、在线状态。
  - `address-book-container` 已提供通讯录入口（联系人/群组/通知）。
  - 聊天信息抽屉已接入备注编辑。

- **群组**
  - `GroupDomain` 已封装已加入群列表、群详情、创建/加入/离开/解散。
  - `useGroup()` 已暴露列表/选择/刷新能力。
  - `group-list` 组件已支持基础展示。

- **用户资料**
  - `UserInfoDomain` 已封装资料拉取、订阅、自身资料更新。
  - `useUserInfo()` / `useOwnUserInfo()` 已暴露展示能力。
  - Provider 已暴露 `enableUserInfo` / `enableUserInfoSubscription` 开关。

### 3.2 明显缺口（按影响面排序）

1. **群信息/群管理抽屉**：群详情展示、群资料编辑、全员禁言、转让群主、解散/退出。
2. **群成员列表与管理**：成员分页、管理员设置、移除成员、禁言、黑名单、白名单。
3. **群公告**：获取与更新公告。
4. **群文件**：上传/下载/删除共享文件。
5. **群名片**：设置/展示自己在群内的 namecard。
6. **群邀请/申请通知**：处理收到的群邀请、入群申请审批。
7. **公开群发现**：搜索并加入公开群。
8. **好友申请通知**：接收并处理 `onContactInvited` 等事件。
9. **个人资料页**：编辑自身昵称/头像/签名等。
10. **联系人详情页/黑名单管理页**：独立页面展示与操作。

---

## 四、建议实现路线

### P0：聊天基础体验补齐

- 群聊顶部 header 展示群名称/成员数/头像。
- 点击群 header 打开 **群信息抽屉**（`chat-group-info-drawer`）。
- 抽屉内展示：群名称、群公告、成员入口、消息免打扰、全员禁言、退出/解散。

### P1：群成员管理

- 新增 `GroupMemberList` 组件，分页获取成员。
- 支持：成员搜索、管理员标识、长按/点击菜单（禁言、移除、设为管理员、移入黑名单）。
- 在 `GroupDomain` 中封装 `Group` 单群对象的相关方法。

### P2：群公告与群资料编辑

- 群公告展示与编辑页面。
- 群名称、群描述、群头像、群扩展资料编辑。

### P3：群设置与权限

- 全员禁言开关、入群审批开关、允许成员邀请开关、公开/私有切换。
- 转让群主。

### P4：群文件与群名片

- 群文件列表、上传、下载、删除。
- 群名片设置与展示（消息气泡中展示群名片）。

### P5：通知与发现

- 好友申请通知列表。
- 群邀请通知列表。
- 入群申请审批列表（群主/管理员）。
- 公开群搜索与加入。

### P6：个人与联系人详情

- 个人资料编辑页。
- 联系人详情页（头像、昵称、备注、签名、删除好友、加入黑名单）。
- 黑名单管理页。

---

## 五、实现规范

### 5.1 分层约定

```text
UI 组件 (.vue)  →  composable (useXxx.ts)  →  Domain (sdk/domain/*-domain.ts)  →  SDK Manager
```

- **Domain 层**：只依赖 `*StoreLike` 构造注入，不直接 `useXxxStore()`。
- **Composable 层**：通过 `useUIKit()` 取 `domains` 与 `stores`，写操作委托 Domain。
- **Store 层**：setup-store 形态，数据 store 必带 `clearXxx()` reset。
- **组件层**：状态用 `computed(() => store.xxx)` 包裹暴露，不返回裸 ref。

### 5.2 新增 Domain 方法示例

```ts
// sdk/domain/group-domain.ts
async function fetchGroupMembers(groupId: string, query?: GroupMemberListQuery) {
  const group = this.client.groupManager.getGroup(groupId)
  return group.getMembers(query)
}

async function muteGroupMembers(groupId: string, userIds: string[], muteDuration: number) {
  const group = this.client.groupManager.getGroup(groupId)
  return group.muteMembers({ userIds, muteDuration })
}
```

### 5.3 新增 Composable 示例

```ts
// composables/use-group-members.ts
export function useGroupMembers(groupId: MaybeRefOrGetter<string>) {
  const { domains, stores } = useUIKit()
  const id = computed(() => toValue(groupId))
  const members = computed(() => stores.group.getMembers(id.value))

  async function fetchMembers(query?: GroupMemberListQuery) {
    const page = await domains.group.fetchGroupMembers(id.value, query)
    stores.group.setMembers(id.value, page.items)
    return page
  }

  return { members, fetchMembers }
}
```

### 5.4 事件刷新

新增能力后，记得在 `sdk/event/group-events.ts` / `contact-events.ts` 的事件处理中更新对应 store，确保 UI 实时刷新。

---

## 六、注意事项

- **GroupManager 推荐通过 `getGroup(groupId)` 获取单群对象操作**，而不是全部走 `GroupManager` 顶层 API；UIKIT Domain 中应按需封装单群对象方法。
- **群成员列表、禁言列表、黑名单、白名单都支持分页**，UI 组件需要支持 cursor 分页加载。
- **用户资料订阅需要服务端开通**，Provider 已提供 `enableUserInfoSubscription` 开关；未开通时 UIKIT 会自动熔断并 Toast 提示一次。
- **群文件上传使用原生 XMLHttpRequest + FormData**，不是走 `UploadAdapter`，在小程序环境需要额外适配。
- **权限控制**：群主/管理员才能执行移除成员、禁言、设置管理员、转让群主等操作；UI 层应根据当前用户在群内的角色做按钮显隐。
- **数据权限**：部分接口（如公开群列表、群文件）可能受 App Key 能力开关限制，实现时注意错误提示。

---

## 七、快速参考：下一步可指挥 AI 实现的任务

- "实现群信息抽屉：展示群详情、群公告入口、成员入口、退出/解散"
- "实现群成员列表组件，支持分页、搜索、管理员/禁言/移除操作"
- "实现群公告组件：获取公告、编辑公告"
- "实现好友申请通知列表：接受/拒绝申请"
- "实现群邀请/入群申请通知列表"
- "实现个人资料编辑页"
- "实现联系人详情页与黑名单管理页"
- "实现公开群搜索与加入"
