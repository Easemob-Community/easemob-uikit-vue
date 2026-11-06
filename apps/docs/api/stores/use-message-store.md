# useMessageStore

按会话管理消息、发送状态、置顶、合并消息解析和群已读数据。

## 导入与上下文

```ts
import { useMessageStore } from '@easemob-community/uikit-im'

const store = useMessageStore()
```

## State

| 成员 | 说明 |
| --- | --- |
| `messageMap` | `conversationId → UiMessage[]` |
| `pinnedMessageMap` | 各会话置顶消息 |
| `parsedCombineMessageMap` | 合并消息子消息缓存 |
| `groupMessageReadUsersMap` | 群消息已读成员缓存 |
| `atMeMessageMap` | 各会话 @我的消息 ID |
| `isSyncingMessages` | 消息同步状态 |

## Actions 与用法

```ts
store.addMessage(message)
store.updateMessageStatus(messageId, 'read')
store.markFailed(localId, reason)
store.setOptions({ maxMessageCount: 300, maxCachedConversations: 20 })
const messages = store.messageMap[conversationId] ?? []
```

直接给 `messageMap[id]` 赋值会替换整组消息；追加使用 `addMessage`。缓存淘汰会跳过当前会话。
