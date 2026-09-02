// SDK 层已收敛到 @easemob/uikit-sdk-websdk5（adapter）+ @easemob/uikit-sdk-contract（中立契约），
// 此处 re-export 保持 @easemob/uikit-im 既有公开 API 不变。

// SDK5 适配器类型面（client / domain / adapter / event 等类型）。
// ⚠️ 决策 22：主入口保持零 adapter **值级**静态引用（保证 4.x 下游摇树隔离），
// 这里只做 type-only re-export（编译期擦除、零运行时引用）；
// SDK5 的值级导出（Websdk5Adapter / Domain 类 / toUiMessage 等）已迁至
// 子路径入口 `@easemob/uikit-im/websdk5`（import 即注册默认内置适配器）。
export type * from '@easemob/uikit-sdk-websdk5'

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

// SDK 无关的值级工具（中立实现已在 core）：承接原 adapter 星号 re-export 的兼容面，
// 使常用值导出（toUiMessage / formatSdkError 等）在主入口保持可用且不引入 adapter 静态引用
export {
  formatSdkError,
  toUiMessage,
  toUiMessages,
} from '@easemob/uikit-core'

export type { UIKitContext } from '../composables/use-uikit'
