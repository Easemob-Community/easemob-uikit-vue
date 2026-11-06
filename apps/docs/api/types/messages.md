# 消息类型

消息相关类型从 `@easemob-community/uikit-im` 以 `type` 导入。

## UiMessage 与 UiMessageExtension

`UiMessage` 是 UIKit 的中立消息对象，`UiMessageExtension` 补充展示层状态。常用字段包括：

| 字段 | 类型/说明 |
| --- | --- |
| `isSelf` | 是否当前用户发送 |
| `status` | `MessageStatusValue`，如发送中、成功、失败、已读 |
| `localId` | 本地消息 ID |
| `recalled` / `recalledBy` | 撤回状态与操作者 |
| `pinned` / `pinTime` / `pinOperatorId` | 置顶状态与元信息 |
| `translation` / `showTranslation` | 翻译结果与展示开关 |
| `voiceText` / `voiceTranscribing` | 语音转文字结果与状态 |
| `requireGroupAck` / `groupMemberCount` | 群已读回执上下文 |

`MessageStatus` 是 `MessageStatusValue` 的别名。

## 消息体

- `TextMessageBody`：`content`、可选 `targetLanguages`、`translations`。
- `ImageMessageBody` / `VideoMessageBody` / `VoiceMessageBody` / `FileMessageBody`：媒体地址、文件信息、尺寸或时长。
- `LocationMessageBody`：位置消息数据。
- `CustomMessageBody`：`event` 与可选 `params`。
- `CombineMessageBody`：`title`、`summary`、可选 `messageList`、下载信息和 `combineLevel`。
- `CmdMessageBody` / `NoticeMessageBody`：CMD 与通知消息数据。
- `SendingMessageMeta`：发送过程元信息。

## 结构型守卫

`isTextBody`、`isImageBody`、`isVoiceBody`、`isVideoBody`、`isFileBody`、`isLocationBody`、`isCustomBody`、`isCombineBody`、`isCmdBody` 用于在运行时收窄消息体类型。
