# usePresence

读取用户在线状态，并管理订阅、查询、发布与状态监听。

## 导入与签名

```ts
import { usePresence } from '@easemob-community/uikit-im'

const presence = usePresence()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `presenceMap` / `onlineUserIds` | 在线状态映射与在线用户列表 |
| `loading` | 是否正在获取状态 |
| `subscribePresence(userIds)` / `unsubscribePresence(userIds)` | 管理订阅 |
| `fetchPresence(userIds)` | 主动查询状态 |
| `publishPresence(...)` | 发布当前用户状态 |
| `getPresence(userId)` / `get(userId)` | 读取指定用户状态 |
| `watch(...)` | 监听状态变化 |

## 最小用法

```ts
const { onlineUserIds, subscribePresence, getPresence } = usePresence()
await subscribePresence(['user-b'])
```

在线状态能力受 `features.enablePresence` 和 SDK 服务权限控制。
