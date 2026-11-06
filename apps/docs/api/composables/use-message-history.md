# useMessageHistory

读取当前会话的可展示消息，并按游标加载历史消息。

## 导入与签名

```ts
import { useMessageHistory } from '@easemob-community/uikit-im'

const history = useMessageHistory()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `messages` | 当前会话消息，过滤 CMD 透传消息 |
| `loading` | 是否正在加载历史 |
| `fetchHistoryMessages(cursor?)` | 返回 `{ messages, cursor, isLast }`；未传游标时使用本地缓存游标 |
| `getHistoryCursor` / `setHistoryCursor` / `clearHistoryCursor` | 读取、写入和清除会话游标 |

## 最小用法

```ts
const { messages, loading, fetchHistoryMessages } = useMessageHistory()
const result = await fetchHistoryMessages()
```

没有当前会话时，拉取返回空消息列表和 `isLast: true`。
