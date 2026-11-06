# useGroupStore

管理群列表、当前群、成员、公告和群管理数据缓存。

## 导入与上下文

```ts
import { useGroupStore } from '@easemob-community/uikit-im'

const store = useGroupStore()
```

## State 与 Getters

| 成员 | 说明 |
| --- | --- |
| `groupList` / `currentGroup` | 群列表与当前群 |
| `loaded` / `joinedGroupCount` | 列表加载状态与已加入群数量 |
| `groupMembersMap` | `groupId → 成员数组` |
| `groupAnnouncementMap` | `groupId → 公告` |
| 禁言、黑白名单、共享文件 map | 群管理数据缓存 |

## Actions 与用法

```ts
store.setGroupList(groups)
store.groupMembersMap[groupId] = members
store.setCurrentGroup(group)
```

群操作优先使用 [`useGroup`](/api/composables/use-group)；直接注入成员适用于 mock 或自定义数据源。
