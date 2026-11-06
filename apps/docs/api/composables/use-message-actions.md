# useMessageActions

管理消息多选，并提供撤回、删除、翻译、语音转文字和置顶操作。

## 导入与签名

```ts
import { useMessageActions } from '@easemob-community/uikit-im'

const actions = useMessageActions()
```

## 返回值

- **多选状态**：`isMultiSelectMode`、`selectedMessageIds`、`selectedMessages`。
- **多选操作**：`enterMultiSelectMode`、`exitMultiSelectMode`、`toggleMessageSelection`、`selectAllMessages`、`deselectAllMessages` 等。
- **单条/批量操作**：`recallMessage`、`deleteMessage`、`deleteMessages`。
- **扩展能力**：`translateTextMessage`、`transcribeVoiceMessage`、`pinMessage`、`unpinMessage`、`fetchPinnedMessages`。

## 最小用法

```ts
const { selectedMessages, enterMultiSelectMode, deleteMessages } = useMessageActions()

enterMultiSelectMode()
await deleteMessages(selectedMessages.value.map(message => message.msgServerId || message.msgLocalId))
```

业务调用前应保留用户确认和错误反馈；具体 SDK 限制由当前适配器能力决定。
