# useChatPlugin

在聊天扩展插槽中读取当前会话、用户资料、消息发送和输入框操作能力。

## 导入与签名

```ts
import { useChatPlugin } from '@easemob-community/uikit-im'

const plugin = useChatPlugin()
```

## 返回值

返回 `ChatPluginMergedContext`：

- `currentConversation`、`currentUserId`。
- `send.sendTextMessage`、`send.sendCustomMessage` 及其他消息发送方法。
- `getUserDisplayName(userId)`、`getUserAvatar(userId)`。
- `setText(text)`、`getText()`、`focus()`、`appendMention(contact)`。

## 最小用法

```ts
const { currentConversation, send, setText } = useChatPlugin()
setText('由插件插入的内容')
```

必须在 `EmChatContainer` 提供的上下文中调用，适用于 `#toolbar-extra`、`#input-panel`、`#message-custom`、`#message-action-extra` 等扩展点。输入框上下文不存在时，相关方法退化为空操作并记录警告。
