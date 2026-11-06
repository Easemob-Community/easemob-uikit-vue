# useClient

读取连接与登录状态，并执行 SDK 初始化、登录和 core 层登出。

## 导入与签名

```ts
import { useClient } from '@easemob-community/uikit-im'

const client = useClient()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `client` / `sdkClient` | 当前中立适配器客户端的响应式引用 |
| `connected` / `connecting` / `hasConnectedOnce` | 连接、连接中与首次连接完成状态 |
| `isLoggedIn` / `currentUser` | 登录状态与当前用户 ID |
| `init(config)` | 延迟初始化 SDK |
| `login(...)` / `logout()` | 登录与 core 层登出 |

## 最小用法

```ts
const { connected, currentUser, login } = useClient()

await login({ user: 'user-a', accessToken: 'your-token' })
```

## 使用边界

`logout()` 只清理 core 状态。需要同时清理会话、消息、联系人、群组、草稿和多选状态时，使用 [`useUIKit().logout()`](/api/composables/use-uikit)。
