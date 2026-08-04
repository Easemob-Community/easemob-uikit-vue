import type { UserInfo } from 'easemob-websdk'
import type { UiContact, UiGroup, UiPresence } from '../sdk/types'

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
}
