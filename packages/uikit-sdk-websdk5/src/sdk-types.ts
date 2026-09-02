import type {
  Contact,
  GroupDetail,
  JoinedGroupSummary,
  UserInfo,
} from 'easemob-websdk'

// SDK5 专属来源/条目类型（供展示适配器与下游 re-export 使用）。
// 中立化后这些类型不再从 core 暴露，改由本适配器包导出。

/** SDK 联系人来源联合类型 */
export type SdkContactSource = Contact | UserInfo

/** SDK 群组来源联合类型 */
export type SdkGroupSource = JoinedGroupSummary | GroupDetail

export type {
  GroupMemberEntry,
  GroupMuteEntry,
  GroupMessageReadUser,
  GroupMessageReadUsersResult,
} from 'easemob-websdk'
