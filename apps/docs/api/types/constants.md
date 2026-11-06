# 常量

以下常量从 `@easemob-community/uikit-im` 导出，业务代码应使用常量而不是硬编码字符串。

| 常量 | 用途 | 对应值类型 |
| --- | --- | --- |
| `CONVERSATION_TYPE` | 单聊、群聊等会话类型 | `ConversationTypeValue` |
| `MESSAGE_TYPE` | 文本、媒体、自定义、合并等消息类型 | `MessageTypeValue` |
| `MESSAGE_STATUS` | 发送与阅读状态 | `MessageStatusValue` |
| `GROUP_MEMBER_ROLE` | 群主、管理员、成员等角色 | `GroupMemberRoleValue` |
| `PRESENCE_STATUS` | 在线状态 | `PresenceStatusValue` |
| `ACK_TYPE` | 回执类型 | `AckTypeValue` |
| `FORWARD_MODE` | 转发模式 | `ForwardModeValue` |
| `NOTICE_EVENT_TYPE` | 系统通知事件 | `NoticeEventTypeValue` |
| `STREAM_MESSAGE_STATUS` | 流式消息生命周期 | `StreamMessageStatusValue` |
| `STREAM_CUSTOM_TYPE` | 流式业务内容类型 | `StreamCustomTypeValue` |
| `HEADER_ALIGN` | 头部对齐方式 | `HeaderAlignValue` |
| `GROUP_INFO_LIMIT` | 群信息相关限制 | — |
| `INJECTION_KEY` | UIKit 注入键 | — |

```ts
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '@easemob-community/uikit-im'

const type = CONVERSATION_TYPE.SINGLE_CHAT
const messageType = MESSAGE_TYPE.TEXT
```
