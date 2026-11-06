# useGroup

管理群列表、当前群、成员、公告、群邀请和群生命周期操作。

## 导入与签名

```ts
import { useGroup } from '@easemob-community/uikit-im'

const group = useGroup()
```

## 返回值

- **状态**：`groupList`、`currentGroup`、`loaded`、`joinedGroupCount`、`loading`、`hasMore`。
- **筛选与选择**：`filterText`、`activeId`、`selectedIds` 及对应设置方法。
- **资料读取**：`fetchGroups`、`fetchGroupInfo`、`fetchGroupMembers`、`fetchGroupAnnouncement`。
- **群操作**：`createGroup`、`joinGroup`、`leaveGroup`、`destroyGroup`、`changeGroupOwner`、`inviteUsersToGroup`、`removeGroupMembers`。
- **管理与邀请**：`addGroupAdmin`、`removeGroupAdmin`、`acceptGroupInvitation`、`declineGroupInvitation`、`updateGroupInfo`、`updateGroupAnnouncement`。

## 最小用法

```ts
const { groupList, fetchGroupMembers, inviteUsersToGroup } = useGroup()
await inviteUsersToGroup('group-id', ['user-b'])
```

可用操作仍受当前用户群角色和 SDK 权限约束。
