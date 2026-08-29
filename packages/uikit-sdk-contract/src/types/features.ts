/** 联系人拉取模式 */
export type ContactFetchMode = 'page' | 'all'

/**
 * Provider 下发的全局能力开关。
 * 定义在中立契约包，供 adapter 与 UIKit 共享。
 */
export interface UIKitFeatures {
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  /** 陌生人 Presence 策略：'none' 不获取；'query-on-visible' 可见时查询 */
  presenceStrangerMode?: 'none' | 'query-on-visible'
  /** 是否在群成员列表可见时主动查询 Presence，默认 true */
  fetchGroupMemberPresenceOnVisible?: boolean
  contactFetchMode: ContactFetchMode
  enableGroup: boolean
  /** 是否启用自动拉取/展示用户资料（昵称/头像），默认 true */
  enableUserInfo?: boolean
  /** 是否启用用户资料变更订阅；默认 true，服务端返回无权限时自动熔断 */
  enableUserInfoSubscription?: boolean
  /** 是否持久化好友申请/群邀请记录到 localStorage，默认 true */
  enableInvitePersistence?: boolean
  /** 是否启用会话列表草稿显示，默认 true */
  enableDraft?: boolean
  /** 是否启用 @我 提示，默认 true */
  enableAtMe?: boolean
  /** 是否启用对方正在输入提示（typing CMD），默认 true */
  enableTyping?: boolean
  /** 好友列表是否过滤掉已拉黑用户，默认 true（仅联系人子视图/好友列表生效，选人弹窗不受影响） */
  filterBlockedContacts?: boolean
}
