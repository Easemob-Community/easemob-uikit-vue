# useMessage

提供消息查询与常用操作的聚合入口。新代码可按职责直接使用 `useMessageHistory` 或 `useMessageActions`。

## 导入与签名

```ts
import { useMessage } from '@easemob-community/uikit-im'

const message = useMessage()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `getMessages(conversationId)` | 返回指定会话消息数组的 `ComputedRef` |
| `messages` | 当前会话的可展示消息 |
| `fetchHistoryMessages(cursor?)` | 拉取当前会话历史消息 |
| `deleteMessage(...)` / `recallMessage(...)` | 删除或撤回消息 |

## 最小用法

```ts
const { getMessages } = useMessage()
const messages = getMessages('user-b')
```
