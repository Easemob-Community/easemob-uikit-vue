import type { UserInfo } from 'easemob-websdk'
import type { CreateGroupParams, UiContact, UiGroup, UiPresence } from '../sdk/types'

/**
 * 业务可插拔的数据源适配器。
 * 不传任意一项 -> 走 SDK 默认实现。
 * 传入 -> 业务接管该接口的数据获取/订阅。
 */
export interface UIKitDataSource {
  fetchContacts?: (params?: { cursor?: string, pageSize?: number }) => Promise<{ list: UiContact[], cursor?: string, hasMore?: boolean }>
  fetchBlocklist?: () => Promise<UiContact[]>
  fetchGroups?: (params: { cursor?: string, pageSize?: number }) => Promise<{ list: UiGroup[], cursor?: string, hasMore?: boolean }>
  fetchPresence?: (userIds: string[]) => Promise<UiPresence[]>
  subscribePresence?: (userIds: string[]) => Promise<void> | void
  unsubscribePresence?: (userIds: string[]) => Promise<void> | void
  /** 业务自定义用户资料源；返回数组至少包含 userId，可选 nickname/avatarUrl 等 */
  fetchUserInfos?: (userIds: string[]) => Promise<Array<Pick<UserInfo, 'userId' | 'nickname' | 'avatarUrl' | 'sign' | 'ext'>>>
  /**
   * 服务端搜索用户：按手机号/邮箱/昵称等业务字段查询环信 userId。
   * 不传时添加联系人组件退化为直接输入 userId 添加。
   * Business-side user search: map phone/email/etc. to Easemob userId.
   */
  searchUsers?: (keyword: string) => Promise<UiContact[]>
  /**
   * 业务接管添加好友动作（可先登记自有业务系统，再调用 SDK 添加）。
   * 不传时走 SDK contactManager.addContact 默认实现。
   * Business takeover of add-contact action; falls back to SDK by default.
   */
  addContact?: (userId: string, message?: string) => Promise<void>
  /**
   * 业务接管创建群组动作（可先登记自有业务系统，再调用 SDK 创建）。
   * 不传时走 SDK groupManager.createGroup 默认实现。
   * Business takeover of create-group action; falls back to SDK by default.
   */
  createGroup?: (params: CreateGroupParams) => Promise<{ groupId: string }>
}

/** 联系人拉取模式 */
export type ContactFetchMode = 'page' | 'all'

/** Provider 下发的全局能力开关 */
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
}
