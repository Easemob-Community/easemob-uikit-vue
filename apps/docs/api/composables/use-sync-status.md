# useSyncStatus

观察登录后会话、联系人和群组三类数据的自动同步进度。

## 导入与签名

```ts
import { useSyncStatus } from '@easemob-community/uikit-im'

const sync = useSyncStatus()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `status` | 按 `conversation`、`contact`、`group` 分组的 `SyncState` |
| `isSyncing` | 任一类数据仍在同步 |
| `allFinished` | 三类数据均已进入 `success` 或 `failed` 终态 |

每个 `SyncState` 包含 `status`，终结态可包含 `finishedAt`，失败时包含错误信息。

## 最小用法

```ts
const { status, isSyncing, allFinished } = useSyncStatus()
console.log(status.value.conversation.status)
```

离线消息漫游不在此状态内，消息加载状态由消息 store 单独维护。
