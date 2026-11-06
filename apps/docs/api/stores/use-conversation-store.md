# useConversationStore

管理会话列表、当前会话、同步状态、@我和正在输入状态。

## 导入与上下文

```ts
import { useConversationStore } from '@easemob-community/uikit-im'

const store = useConversationStore()
```

## State 与 Getters

| 成员 | 说明 |
| --- | --- |
| `conversationList` | 会话数组 |
| `currentConversationId` / `currentConversation` | 当前会话 ID 与对象 |
| `sortedConversationList` | 按置顶和时间排序的会话 |
| `conversationsLoaded` / `isSyncingConversations` | 加载与同步状态 |
| `atMeMap` / `typingMap` | @我与正在输入状态 |
| `hasMoreConversations` | 是否还有更多会话 |

## Actions 与用法

```ts
store.setConversationList(conversations)
store.setCurrentConversationId('user-b')
store.updateUnreadCount('user-b', 0)
store.setAtMe('user-b', true)
```

真实业务优先走 `dataSource` 和 SDK 事件管线；直接写入适用于 mock、演示或自定义数据源。
