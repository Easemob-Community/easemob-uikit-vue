# 会话类型

## UiConversation

```ts
import type { UiConversation } from '@easemob-community/uikit-im'
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 会话 ID |
| `name` | `string` | 展示名称 |
| `avatar` | `string?` | 头像 |
| `type` | `ConversationTypeValue` | 会话类型 |
| `unreadCount` | `number` | 未读数 |
| `lastMessageText` | `string` | 最后消息摘要 |
| `lastMessageFrom` | `string?` | 最后消息发送者 |
| `lastMessageTime` | `number?` | 最后消息时间 |
| `isPinned` / `pinnedTime` | `boolean` / `number?` | 置顶状态与时间 |
| `isMuted` | `boolean` | 是否免打扰 |
| `marks` | `number[]` | 会话标记 |
| `draft` / `draftTime` | `string?` / `number?` | 草稿内容与保存时间 |
| `remindType` | `string?` | 提醒类型 |

相关常量为 `CONVERSATION_TYPE`，对应值类型为 `ConversationTypeValue`。
