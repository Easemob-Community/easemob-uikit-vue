import type { EventPayloadMap } from 'im-sdk-web'
import type { UIKitClient } from '../client'
import type { RootStores } from './index'
import { mapSessionItem } from '../../composables/use-conversation'

/**
 * 创建会话相关事件处理器
 */
export function createConversationHandler(client: UIKitClient, stores: RootStores) {
  const handler = {
    /** 会话列表同步开始 */
    onConversationListSyncDidStart: () => {
      console.log('[EventHandler] onConversationListSyncDidStart')
      stores.conversation.setSyncingConversations(true)
    },

    /** 会话列表同步完成 */
    onConversationListSyncDidFinish: (_payload?: EventPayloadMap['onConversationListSyncDidFinish']) => {
      console.log('[EventHandler] onConversationListSyncDidFinish')
      stores.conversation.setSyncingConversations(false)
      // 同步完成后从本地 SessionList 读取会话数据（WebSocket 同步的内存数据）
      try {
        const sessionList = client.conversation.getSessionList()
        console.log('[EventHandler] getSessionList returned', {
          count: sessionList.length,
          sessions: sessionList.map((s: unknown) => ({
            sessionId: (s as Record<string, unknown>).sessionId,
            type: (s as Record<string, unknown>).type,
            unreadCount: (s as Record<string, unknown>).unreadCount,
          })),
        })
        const mapped = sessionList.map((item: unknown) => mapSessionItem(item))
        stores.conversation.setConversationList(mapped)
      } catch (e) {
        console.warn('[EventHandler] getSessionList failed:', e)
      }
      // 同步完成后标记已加载，避免 container 重复调用 REST 接口
      stores.conversation.setConversationsLoaded(true)
    },

    /** 会话实时更新 */
    onConversationUpdate: () => {
      // 从 SessionListCache 重新读取完整数据，确保 isPinned、isMuted、displayName、
      // remindType、marks 等 SessionItem 特有字段正确更新。
      // 直接映射 payload 会丢失这些字段。
      try {
        const sessionList = client.conversation.getSessionList()
        const mapped = sessionList.map((item: unknown) => mapSessionItem(item))
        mapped.forEach((cvs: unknown) => stores.conversation.addConversation(cvs as import('../../store/conversation').Conversation))
      } catch (e) {
        console.warn('[EventHandler] onConversationUpdate getSessionList failed:', e)
      }
    },

    /** 多设备会话同步（删除/置顶/标记/免打扰等） */
    onMultiDeviceConversation: (event: EventPayloadMap['onMultiDeviceConversation']) => {
      const { operation, conversationId } = event
      if (!conversationId) return
      switch (operation) {
        case 'CONVERSATION_DELETED':
          stores.conversation.deleteConversation(conversationId)
          break
        case 'CONVERSATION_PINNED':
          stores.conversation.updateConversation(conversationId, { isPinned: true })
          break
        case 'CONVERSATION_UNPINNED':
          stores.conversation.updateConversation(conversationId, { isPinned: false })
          break
        case 'CONVERSATION_MARK':
          if (event.mark !== undefined) {
            stores.conversation.updateConversation(conversationId, { marks: [event.mark] })
          }
          break
        case 'CONVERSATION_MUTE_INFO_CHANGED':
          if (event.remindType) {
            stores.conversation.updateConversation(conversationId, {
              isMuted: event.remindType === 'none',
              remindType: event.remindType,
            })
          }
          break
        default:
          console.log('[UIKit] onMultiDeviceConversation unhandled:', event)
      }
    },

    /** 多设备消息删除同步 */
    onMultiDeviceMessageRemoved: (event: EventPayloadMap['onMultiDeviceMessageRemoved']) => {
      const { operation, conversationId, messageIds, beforeTimestamp } = event
      if (!conversationId) return
      if (operation === 'MESSAGE_REMOVED') {
        if (messageIds && messageIds.length > 0) {
          stores.message.deleteMessages([...messageIds])
        } else if (beforeTimestamp) {
          // 按时间戳删除该会话下所有早于该时间戳的消息
          const msgs = stores.message.getMessages(conversationId)
          const idsToDelete = msgs
            .filter((m: { timestamp?: number; id?: string }) => m.timestamp && m.timestamp < beforeTimestamp)
            .map((m: { id?: string }) => m.id)
            .filter((id: string | undefined): id is string => !!id)
          if (idsToDelete.length > 0) {
            stores.message.deleteMessages(idsToDelete)
          }
        }
      }
    },
  }

  return handler
}
