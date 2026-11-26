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

## 自动订阅与上限

启用 `features.enablePresence` 后，UIKit 会跟随会话列表（当前筛选结果）自动维护单聊对方的订阅：按列表顺序只订阅前 100 个单聊（去重），更靠后的会话在虚拟滚动/可见性感知落地前不会自动订阅；列表变化时增量订阅新增用户、退订已移除用户，订阅失败按 5 秒 → 60 秒指数退避合并重试，订阅后仍无状态的用户回退到主动查询补齐，Provider 作用域销毁时清理重试定时器。

需要覆盖更多用户时，业务可自行调用 `subscribePresence(userIds)`（单次 ≤100、总数 ≤3000、最长 30 天），或用 `fetchPresence(userIds)` 直接查询；`getPresence(userId)` 只读取本地缓存状态。

## 最小用法

```ts
const { onlineUserIds, subscribePresence, getPresence } = usePresence()
await subscribePresence(['user-b'])
```

在线状态能力受 `features.enablePresence` 和 SDK 服务权限控制。
