# useChat

聚合当前会话、消息发送、历史记录、编辑转发和消息操作，是聊天业务的高层入口。

## 导入与签名

```ts
import { useChat } from '@easemob-community/uikit-im'

const chat = useChat()
```

## 返回值

- **当前会话**：`currentConversation`。
- **历史消息**：`messages`、`loadingHistory`、`fetchHistoryMessages` 和游标方法。
- **发送**：`sendTextMessage`、`sendImageMessage`、`sendFileMessage`、`sendAudioMessage`、`sendVideoMessage`、`sendLocationMessage`、`sendCustomMessage`、`sendCmdMessage`、`sendMultiBodyMessage`、`resendMessage`。
- **编辑与转发**：`editingMessage`、`enterEditMode`、`modifyTextMessage`、`forwardMessage`、`forwardCombineMessages` 等。
- **消息操作**：多选、撤回、删除、置顶、翻译和语音转文字能力。

## 最小用法

```ts
const { currentConversation, messages, sendTextMessage } = useChat()

await sendTextMessage('你好', { businessKey: 'value' })
```

发送方法作用于 `currentConversation`；没有当前会话时不发送。需要更窄的 API 时可分别使用 [`useMessageSend`](/api/composables/use-message-send)、[`useMessageHistory`](/api/composables/use-message-history) 和 [`useMessageActions`](/api/composables/use-message-actions)。
