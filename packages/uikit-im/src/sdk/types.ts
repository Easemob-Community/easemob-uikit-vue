import type { useMessageStore } from '../store/message'
import type { useConversationStore } from '../store/conversation'
import type { useContactStore } from '../store/contact'
import type { useGroupStore } from '../store/group'
import type { useClientStore, usePresenceStore, useUserInfoStore } from '@easemob/uikit-core'

/**
 * UIKit 事件/域可访问的 Pinia Store 集合（场景层完整类型）。
 * adapter 的 registerEventHandlers / 各 domain 以最小结构接口（EventStores / XStoreLike）
 * 消费，本类型在场景层保留完整 Pinia 类型供组件与 composable 使用。
 */
export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  conversation: ReturnType<typeof useConversationStore>
  contact: ReturnType<typeof useContactStore>
  group: ReturnType<typeof useGroupStore>
  presence: ReturnType<typeof usePresenceStore>
  client: ReturnType<typeof useClientStore>
  userInfo: ReturnType<typeof useUserInfoStore>
}
