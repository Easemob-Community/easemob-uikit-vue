# usePresenceStore

保存用户在线状态与订阅集合。

## 导入与上下文

```ts
import { usePresenceStore } from '@easemob-community/uikit-im'

const store = usePresenceStore()
```

## State 与 Getters

| 成员 | 说明 |
| --- | --- |
| `presenceMap` | `Map<userId, UiPresence>` |
| `subscribedUserIds` | 已订阅用户 ID 集合 |
| `onlineUserIds` | 状态为 `online` 的用户 ID 数组 |

## Actions 与用法

```ts
store.updateBatch([{ userId: 'user-b', status: 'online', ext: '', lastTime: Date.now() }])
```

真实业务优先使用 [`usePresence`](/api/composables/use-presence) 管理订阅和查询；直接写入适用于 mock 或外部数据源。
