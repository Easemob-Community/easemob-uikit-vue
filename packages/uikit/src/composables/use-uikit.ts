import { inject, type InjectionKey, type Ref } from 'vue'
import type { UIKitClient } from '../sdk/client'
import type { RootStores } from '../sdk/event-handler'
import type { Contact } from '../store/contact'
import type { Group } from '../store/group'
import type { PresenceInfo } from '../store/presence'

/**
 * 业务可插拔的数据源适配器
 * - 不传任意一项 -> 走 SDK 默认实现
 * - 传入 -> 业务接管该接口的数据获取/订阅
 */
export interface UIKitDataSource {
  fetchContacts?: (params?: { cursor?: string; pageSize?: number }) => Promise<{ list: Contact[]; cursor?: string; hasMore?: boolean }>
  fetchBlocklist?: () => Promise<Contact[]>
  fetchGroups?: (params: { cursor?: string; pageSize?: number }) => Promise<{ list: Group[]; cursor?: string; hasMore?: boolean }>
  fetchPresence?: (userIds: string[]) => Promise<PresenceInfo[]>
  subscribePresence?: (userIds: string[]) => Promise<void> | void
  unsubscribePresence?: (userIds: string[]) => Promise<void> | void
}

/**
 * 联系人拉取模式
 * - 'page': 分页拉取（默认，推荐）
 * - 'all':  一次性全量拉取（getAllContacts）
 */
export type ContactFetchMode = 'page' | 'all'

/** Provider 下发的全局能力开关 */
export interface UIKitFeatures {
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  /** 联系人拉取模式，默认 'page' */
  contactFetchMode: ContactFetchMode
  /** 是否启用群组体系，默认 true */
  enableGroup: boolean
}

export interface UIKitContext {
  client: Ref<UIKitClient | null>
  stores: RootStores
  theme: ReturnType<typeof import('../store/theme').useThemeStore>
  locale: ReturnType<typeof import('../locale').useLocale>
  /** 能力开关（provider 实例化时冻结） */
  features: UIKitFeatures
  /** 业务可插拔的数据源适配器，不传则为空对象 */
  dataSource: UIKitDataSource
}

export const UIKIT_CONTEXT_KEY: InjectionKey<UIKitContext> = Symbol('uikit')

export function useUIKit() {
  const ctx = inject(UIKIT_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useUIKit() must be used within <UIKitProvider>')
  }
  return ctx
}
