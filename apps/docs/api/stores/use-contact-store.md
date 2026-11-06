# useContactStore

管理联系人、黑名单、好友与群邀请，以及联系人筛选和选择状态。

## 导入与上下文

```ts
import { useContactStore } from '@easemob-community/uikit-im'

const store = useContactStore()
```

## State 与 Getters

| 成员 | 说明 |
| --- | --- |
| `contactList` / `blackList` / `inviteList` | 联系人、黑名单与邀请 |
| `loaded` / `blockListLoaded` | 数据加载状态 |
| `filterText` / `activeId` / `selectedIds` | 筛选、激活与多选状态 |
| `contactCount` | 联系人数量 |

## Actions 与用法

```ts
store.setContactList(contacts)
store.setBlackList(blockedContacts)
store.setSelectedIds(['user-b'])
```

联系人写操作优先使用 [`useContact`](/api/composables/use-contact)，避免绕过业务域和事件同步。
