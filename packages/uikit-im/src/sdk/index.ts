// SDK 层已收敛到 @easemob/uikit-sdk-websdk5（adapter）+ @easemob/uikit-sdk-contract（中立契约），
// 此处 re-export 保持 @easemob/uikit-im 既有公开 API 不变。

// SDK5 适配器（client / domain / adapter / event / notification / sync-status / Websdk5Adapter）
export * from '@easemob/uikit-sdk-websdk5'

// 中立类型 + 结构型守卫（经契约包）
export type {
  CmdMessageBody,
  CombineMessageBody,
  CreateGroupParams,
  CustomMessageBody,
  FileMessageBody,
  ImageMessageBody,
  LocationMessageBody,
  MessageStatus,
  NoticeMessageBody,
  SendingMessageMeta,
  TextMessageBody,
  UiContact,
  UiContactInvite,
  UiConversation,
  UiGroup,
  UiGroupMember,
  UiMessage,
  UiMessageExtension,
  UiNoticeMessage,
  UiPresence,
  VideoMessageBody,
  VoiceMessageBody,
} from '@easemob/uikit-sdk-contract'
export {
  isCmdBody,
  isCombineBody,
  isCustomBody,
  isFileBody,
  isImageBody,
  isLocationBody,
  isTextBody,
  isVideoBody,
  isVoiceBody,
} from '@easemob/uikit-sdk-contract'

// 通知管线公开面：仅导出类型与通知构建/插入工具
export type { NoticeConfig, NoticeContext, NoticeInsertContext } from '@easemob/uikit-core'
export {
  buildAnnouncementNoticeText,
  createNoticeMessage,
  insertChatNotice,
  isNoticeMessage,
  resolveNoticeUserName,
} from '@easemob/uikit-core'

export type { UIKitContext } from '../composables/use-uikit'
