# useContact

管理联系人、黑名单和好友申请，并提供筛选、选择、搜索与分页能力。

## 导入与签名

```ts
import { useContact } from '@easemob-community/uikit-im'

const contact = useContact()
```

## 返回值

- **状态**：`contactList`、`visibleContactList`、`contactCount`、`blackList`、`inviteList`、`loaded`、`loading`、`hasMore`。
- **筛选与选择**：`filterText`、`activeId`、`selectedIds`、`setFilterText`、`toggleSelect`、`setSelectedIds` 等。
- **数据操作**：`fetchContacts`、`fetchBlocklist`、`refresh`、`loadMore`、`searchUsers`。
- **联系人操作**：`addContact`、`deleteContact`、`setContactRemark`、`acceptContactInvite`、`declineContactInvite`、`addToBlocklist`、`removeFromBlocklist`。

## 最小用法

```ts
const { contactList, addContact, acceptContactInvite } = useContact()
await addContact('user-b', '希望添加你为联系人')
```

数据读取与写入应在 Provider 上下文中进行，自定义数据源行为由 Provider 的 `dataSource` 决定。
