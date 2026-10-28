# GroupManagement 群管理

群管理模块覆盖群详情页常见的管理能力：全员禁言、禁言列表、黑名单、白名单、共享文件与入群申请，以及群公告、群成员列表、群详情卡片等业务组件。所有组件均以 `Em` 前缀命名导出，需在 `EmUIKitProvider` 内使用（依赖登录态与群组 store）。

![群详情抽屉与群管理入口](../guide/images/overview/group-main.png)

## 使用方式

```vue
<script setup lang="ts">
import { EmUIKitProvider, EmGroupManagementSection } from '@easemob-community/uikit-im'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
  >
    <div style="width: 360px;">
      <!-- 群管理入口 + 二级页（默认 drawer 抽屉形态） -->
      <em-group-management-section group-id="group-id" display-mode="drawer" />
    </div>
  </EmUIKitProvider>
</template>
```

> 管理入口按当前用户角色做权限门控：全员禁言、禁言列表、黑名单、入群申请对群主 / 管理员可见；白名单仅群主可见。

## EmGroupManagementSection 群管理入口

群管理入口区块，渲染「全员禁言」开关与各管理入口列表（带数量角标），点击入口后以二级页展示对应管理列表。二级页支持 `drawer`（抽屉）与 `modal`（居中弹窗）两种形态，通过 `display-mode` 切换。

<!-- @include: ../.vitepress/gen/group-management-section.md -->

> 权限门控：全员禁言开关、禁言列表、黑名单、入群申请入口对群主 / 管理员可见；白名单入口仅群主可见。
> `group-operation` 事件的 `type` 取值：`mute-all` / `unmute-all` / `mute-member` / `unmute-member` / `block-member` / `unblock-member` / `remove-allowlist-member` / `accept-join-request` / `reject-join-request`。

### 二级页接管插槽

以下插槽用于**完全接管**对应二级页的渲染。作用域类型为 `GroupManagementSectionSlotScope`：

| 插槽名 | 说明 |
| --- | --- |
| `mute-list` | 接管禁言列表二级页 |
| `block-list` | 接管黑名单二级页 |
| `allow-list` | 接管白名单二级页 |
| `shared-files` | 接管共享文件二级页 |
| `join-requests` | 接管入群申请二级页 |

插槽作用域（`GroupManagementSectionSlotScope`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `show` | `boolean` | 该二级页当前是否激活 |
| `groupId` | `string` | 群 ID |
| `open` | `(key: GroupManagementKey) => void` | 打开指定二级页 |
| `close` | `() => void` | 关闭二级页 |

`GroupManagementKey` 类型：`'mute' | 'block' | 'allow' | 'files' | 'requests'`。

```vue
<template>
  <em-group-management-section group-id="group-id">
    <!-- 示例：接管禁言列表二级页 -->
    <template #mute-list="{ show, groupId, close }">
      <div v-if="show">
        <button @click="close">返回</button>
        <custom-mute-panel :group-id="groupId" />
      </div>
    </template>
  </em-group-management-section>
</template>
```

## EmGroupMuteList 禁言列表

禁言成员列表，内置加载、取消禁言二次确认与「添加禁言」弹窗。

<!-- @include: ../.vitepress/gen/group-mute-list.md -->

> `unmute` / `mute` 事件声明负载为 `UiGroupMember`，实际回传 `{ userId }`（`mute` 为批量操作，回传数组）。

### 实例方法

- `openAddMember()`：打开「添加禁言」成员选择弹窗

## EmGroupBlocklist 黑名单

群黑名单列表，内置加载、移出黑名单二次确认与「添加」弹窗。

<!-- @include: ../.vitepress/gen/group-blocklist.md -->

> `unblock` / `block` 事件声明负载为 `UiGroupMember`，实际回传 `{ userId }`（`block` 为批量操作，回传数组）。

### 实例方法

- `openAddMember()`：打开「添加黑名单」成员选择弹窗

## EmGroupAllowlist 白名单

群白名单（全员禁言时可发言成员）列表，内置加载与移除操作。

<!-- @include: ../.vitepress/gen/group-allowlist.md -->

> `remove` 事件声明负载为 `UiGroupMember`，实际回传 `{ userId }`。

## EmGroupSharedFileList 共享文件列表

群共享文件列表，内置加载、上传（移动端 ActionSheet / 桌面端右键菜单）、下载与删除（按角色与文件归属门控）。

<!-- @include: ../.vitepress/gen/group-shared-file-list.md -->

### 实例方法

- `triggerUpload()`：触发文件上传（供二级页头部「上传」按钮调用）

## EmGroupJoinRequestList 入群申请列表

入群申请列表，内置加载与同意 / 拒绝操作，数据源来自群组 store 的申请缓存。

<!-- @include: ../.vitepress/gen/group-join-request-list.md -->

## EmGroupAnnouncement 群公告

群公告展示与编辑组件：默认单行省略（仅超一行时提供展开 / 收起），群主 / 管理员可编辑，长度受 `GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH` 限制。

<!-- @include: ../.vitepress/gen/group-announcement.md -->

## EmGroupMemberList 群成员列表

群成员列表，内置搜索、触底加载、成员在线状态（presence 可视区域懒加载）与行尾 `⋮` 操作菜单（私聊 / 添加联系人 / 设管理员 / 禁言 / 拉黑 / 转让群主 / 移除，按角色与好友关系动态门控）。

<!-- @include: ../.vitepress/gen/group-member-list.md -->

### 插槽

- `member-menu`：接管成员行尾 `⋮` 操作菜单内容，作用域为 `{ member, actions, select, close }`：
  - `member`：当前成员（`UiGroupMember`）
  - `actions`：内置动作列表（`GroupMemberMoreAction[]`，元素含 `key` / `label` / `icon` / `danger`）
  - `select(key: string)`：触发指定内置动作（与点击内置菜单项一致）
  - `close()`：关闭菜单

### 实例方法

- `refresh()`：重新拉取成员列表
- `removeMember(userId)`：本地移除指定成员
- `setMemberRole(userId, role)`：本地更新成员角色

## EmGroupDetail 群详情卡片

群详情卡片，展示群头像、群名（群主可改名）、群 ID 与「发消息」胶囊按钮，底部为退出 / 解散群操作（含二次确认）。

<!-- @include: ../.vitepress/gen/group-detail.md -->

### 插槽

- `avatar`：接管群头像区，作用域 `{ groupId, avatar, displayName }`
- `header`：接管群名（含编辑）与群 ID 信息区，作用域 `{ groupId, displayName, isOwner, group }`
- `extra`：在头部与操作按钮之间插入自定义内容（如群介绍、成员数），作用域 `{ groupId, group }`
- `actions`：接管「发消息」胶囊按钮区，作用域 `{ groupId }`
- `footer`：接管退出 / 解散按钮区，作用域 `{ groupId, isOwner, group }`

## 相关链接

- [群组模块](./group-container)：群组列表容器 `EmGroupListContainer` 与在线演练场
