// SDK
export { UIKitClient, createClient } from './client'
export * from './types'
export * from './adapter'
export * from './domain'
export { registerEventHandlers } from './event/registry'
export type { ConnectionEventCallbacks } from './event/connection-events'
// 通知管线公开面：仅导出类型与通知构建/插入工具，内部装配 API（setNoticeConfigResolver/getNoticeConfig 等）不对外暴露
export type { NoticeConfig, NoticeContext, NoticeInsertContext } from './event/notice-utils'
export {
  buildAnnouncementNoticeText,
  createNoticeMessage,
  insertChatNotice,
  isNoticeMessage,
  resolveNoticeUserName,
} from './event/notice-utils'
export type { UIKitContext } from '../composables/use-uikit'
