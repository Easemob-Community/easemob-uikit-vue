import type { useMessageStore } from '../../store/message'
import type { useConversationStore } from '../../store/conversation'
import type { useContactStore } from '../../store/contact'
import type { useGroupStore } from '../../store/group'
import type { usePresenceStore } from '../../store/presence'
import type { useClientStore } from '../../store/client'

/**
 * 事件处理器可访问的 Pinia Store 集合。
 * 具体类型由各 store 文件提供。
 */
export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  conversation: ReturnType<typeof useConversationStore>
  contact: ReturnType<typeof useContactStore>
  group: ReturnType<typeof useGroupStore>
  presence: ReturnType<typeof usePresenceStore>
  client: ReturnType<typeof useClientStore>
}
