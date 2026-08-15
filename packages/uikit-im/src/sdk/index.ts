// SDK
export { UIKitClient, createClient } from '@easemob/uikit-core'
// sdk/types 已迁入 @easemob/uikit-core，此处显式具名 re-export 保持对外 API 不变
export type {
  CreateGroupParams,
  GroupMemberEntry,
  GroupMuteEntry,
  NoticeMessageBody,
  SdkContactSource,
  SdkGroupSource,
  SendingMessageMeta,
  UiContact,
  UiContactInvite,
  UiConversation,
  UiGroup,
  UiGroupMember,
  UiMessage,
  UiMessageExtension,
  UiNoticeMessage,
  UiPresence,
} from '@easemob/uikit-core'
export type {
  CmdMessageBody,
  CombineMessageBody,
  CustomMessageBody,
  FileMessageBody,
  ImageMessageBody,
  LocationMessageBody,
  MessageStatus,
  TextMessageBody,
  VideoMessageBody,
  VoiceMessageBody,
} from '@easemob/uikit-core'
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
} from '@easemob/uikit-core'
export * from './adapter'
export * from './domain'
export { registerEventHandlers } from './event/registry'
export type { ConnectionEventCallbacks } from '@easemob/uikit-core'
// 通知管线公开面：仅导出类型与通知构建/插入工具，内部装配 API（setNoticeConfigResolver/getNoticeConfig 等）不对外暴露
export type { NoticeConfig, NoticeContext, NoticeInsertContext } from '@easemob/uikit-core'
export {
  buildAnnouncementNoticeText,
  createNoticeMessage,
  insertChatNotice,
  isNoticeMessage,
  resolveNoticeUserName,
} from '@easemob/uikit-core'
export type { UIKitContext } from '../composables/use-uikit'
