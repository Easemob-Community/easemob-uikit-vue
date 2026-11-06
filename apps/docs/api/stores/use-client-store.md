# useClientStore

管理 SDK 客户端快照、连接状态、当前用户和账号失效状态。

## 导入与上下文

```ts
import { useClientStore } from '@easemob-community/uikit-im'

const store = useClientStore()
```

需要先安装 Pinia；真实业务中由 Provider 和 SDK 事件管线维护。

## State 与 Getters

| 成员 | 说明 |
| --- | --- |
| `client` | 中立客户端快照 |
| `connected` / `connecting` / `hasConnectedOnce` | 连接、连接中和首连完成状态 |
| `currentUser` / `appKey` | 当前用户与应用身份 |
| `isLoggedIn` | 根据连接与当前用户计算的登录状态 |
| `kicked` / `kickCode` | 账号被踢终态及 SDK 错误码 |

## Actions 与用法

```ts
store.setCurrentUser('user-a')
store.setKicked(206)
```

`kicked` 用于区分账号失效与网络重连；重新连接成功或清理客户端时清除。完整登出使用 [`useUIKit().logout()`](/api/composables/use-uikit)，不要只清空单个 store。
