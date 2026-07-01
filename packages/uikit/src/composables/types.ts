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
}

/** 联系人拉取模式 */
export type ContactFetchMode = 'page' | 'all'

/** Provider 下发的全局能力开关 */
export interface UIKitFeatures {
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  contactFetchMode: ContactFetchMode
  enableGroup: boolean
}
