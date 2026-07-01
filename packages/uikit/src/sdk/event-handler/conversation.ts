import type { ConversationItem, EventPayloadMap } from 'easemob-websdk'
import type { UIKitClient } from '../client'
import type { RootStores } from './index'
import { mapSessionItem } from '../../composables/use-conversation'

/**
 * 创建会话相关事件处理器
 */
export function createConversationHandler(client: UIKitClient, stores: RootStores) {
  const handler = {
    /** 数据同步开始 */
    onSyncDataStart: () => {
      console.log('[EventHandler] onSyncDataStart')
      stores.conversation.setSyncingConversations(true)
    },

    /** 数据同步完成 */
    onSyncDataFinished: () => {
      console.log('[EventHandler] onSyncDataFinished')
      stores.conversation.setSyncingConversations(false)
      // 同步完成后从本地 ConversationList 读取会话数据
      try {
        const sessionList = client.conversation.getSessionList()
        console.log('[EventHandler] getSessionList returned', {
          count: sessionList.length,
          sessions: sessionList.map((s) => ({
            sessionId: s.conversationId,
            type: s.conversationType,
            unreadCount: s.unreadCount,
          })),
        })
        const mapped = sessionList.map((item: ConversationItem) => mapSessionItem(item))
        console.log('[EventHandler] mapped conversations unread counts:',
          mapped.map((c: import('../../store/conversation').Conversation) => ({ id: c.id, unreadCount: c.unreadCount }))
        )
        stores.conversation.setConversationList(mapped)

        // 补偿：如果当前正在聊天的会话在同步后仍有未读数，自动标记已读
        const currentCvs = stores.conversation.currentConversation
        if (currentCvs) {
          const syncedCvs = mapped.find((c: import('../../store/conversation').Conversation) => c.id === currentCvs.id)
          if (syncedCvs && syncedCvs.unreadCount && syncedCvs.unreadCount > 0) {
            console.log('[EventHandler] auto mark current conversation as read after sync:', {
              conversationId: currentCvs.id,
              unreadCount: syncedCvs.unreadCount,
            })
            client.conversation.markConversationRead({
              conversationId: currentCvs.id,
              conversationType: currentCvs.type,
            }).then(() => {
              stores.conversation.updateUnreadCount(currentCvs.id, 0)
              console.log('[EventHandler] auto mark success:', { conversationId: currentCvs.id })
            }).catch((e: unknown) => {
              console.warn('[EventHandler] auto mark failed:', { conversationId: currentCvs.id, error: e })
            })
          }
        }
      } catch (e) {
        console.warn('[EventHandler] getSessionList failed:', e)
      }
      // 同步完成后标记已加载，避免 container 重复调用 REST 接口
      stores.conversation.setConversationsLoaded(true)
    },

    /** 会话列表实时更新 */
    onConversationListUpdate: (payload: EventPayloadMap['onConversationListUpdate']) => {
      console.log('[EventHandler] onConversationListUpdate', {
        reason: payload.reason,
        count: payload.items.length,
      })
      const mapped = payload.items.map((item: ConversationItem) => mapSessionItem(item))
      stores.conversation.setConversationList(mapped)
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
              isMuted: event.remindType === 'NONE',
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
