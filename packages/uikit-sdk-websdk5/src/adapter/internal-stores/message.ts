import type {
  ConversationTypeValue,
  SdkMessage,
  UiMessage,
} from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from '../../event/types'
import type { HandlersRef, SdkUiMessage } from './types'

/** 创建消息 store：维护会话消息列表并把写入翻译为 SdkEventHandlers */
export function createMessageStore(handlersRef: HandlersRef): EventStores['message'] {
  const messages = new Map<string, SdkUiMessage[]>()
  const sending = new Map<string, SdkMessage>()
  let syncingMessages = false

  function getList(conversationId: string): UiMessage[] {
    return (messages.get(conversationId) ?? []) as UiMessage[]
  }

  function findMessage(
    msgId: string,
  ): { list: SdkUiMessage[], index: number, conversationId: string } | null {
    for (const [conversationId, list] of messages) {
      const index = list.findIndex(m => m.msgServerId === msgId || m.msgLocalId === msgId)
      if (index >= 0)
        return { list, index, conversationId }
    }
    return null
  }

  function upsertMessage(msg: UiMessage) {
    const sdkMsg = msg as SdkUiMessage
    const list = messages.get(sdkMsg.conversationId) ?? []
    const idx = list.findIndex(
      m => m.msgServerId && m.msgServerId === sdkMsg.msgServerId,
    )
    if (idx >= 0) {
      list[idx] = sdkMsg
    }
    else {
      list.push(sdkMsg)
    }
    list.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    messages.set(sdkMsg.conversationId, list)
  }

  return {
    getMessages: getList,

    addMessage(msg) {
      upsertMessage(msg)
      handlersRef()?.onMessage?.(msg as SdkMessage)
    },

    addSendingMessage(localId, sdkMsg) {
      sending.set(localId, sdkMsg)
    },

    replaceWithSent(localId, msg) {
      sending.delete(localId)
      upsertMessage(msg)
      handlersRef()?.onMessage?.(msg as SdkMessage)
    },

    updateUploadProgress(localId, percent) {
      const sdkMsg = sending.get(localId)
      if (!sdkMsg)
        return
      const found = findMessage(sdkMsg.msgLocalId || sdkMsg.msgServerId || '')
      if (found) {
        const updated = { ...found.list[found.index], progress: percent }
        found.list[found.index] = updated
      }
    },

    markFailed(localId, reason) {
      const sdkMsg = sending.get(localId)
      sending.delete(localId)
      const msgId = sdkMsg?.msgLocalId || sdkMsg?.msgServerId
      if (!msgId)
        return
      const found = findMessage(msgId)
      if (found) {
        const updated = { ...found.list[found.index], status: 'failed', failReason: reason }
        found.list[found.index] = updated
      }
    },

    prependMessages(conversationId, msgs) {
      const existing = messages.get(conversationId) ?? []
      const map = new Map<string, SdkUiMessage>()
      for (const msg of msgs) {
        const sdkMsg = msg as SdkUiMessage
        if (sdkMsg.msgServerId)
          map.set(sdkMsg.msgServerId, sdkMsg)
      }
      for (const msg of existing) {
        if (msg.msgServerId && !map.has(msg.msgServerId))
          map.set(msg.msgServerId, msg)
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
      )
      messages.set(conversationId, merged)
    },

    updateStatusByServerId(serverId, status) {
      const found = findMessage(serverId)
      if (!found)
        return
      found.list[found.index] = { ...found.list[found.index], status }
      handlersRef()?.onMessageStatusChanged?.({ messageId: serverId, status })
    },

    recallMessage(serverId, operatorId) {
      const found = findMessage(serverId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.recalled = true
      msg.recalledBy = operatorId
      handlersRef()?.onMessagesRecalled?.({
        messageId: serverId,
        conversationId: found.conversationId,
        conversationType: msg.conversationType as ConversationTypeValue,
        operatorId,
      })
    },

    updateMessage(serverId, msg) {
      const found = findMessage(serverId)
      if (!found)
        return
      const sdkMsg = msg as SdkUiMessage
      found.list[found.index] = sdkMsg
      if (sdkMsg.modified)
        handlersRef()?.onMessageUpdated?.(sdkMsg)
    },

    setPinnedMessages(_conversationId, _msgs) {
      // 内部缓存：事件层刷新置顶列表时写入，暂不通过事件暴露
    },

    setTranslation(msgId, translation) {
      const found = findMessage(msgId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.translation = translation
      msg.showTranslation = true
    },

    setTranslating(msgId, translating) {
      const found = findMessage(msgId)
      if (found)
        found.list[found.index] = { ...found.list[found.index], translating }
    },

    setVoiceText(msgId, voiceText) {
      const found = findMessage(msgId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.voiceText = voiceText
      msg.showVoiceText = true
    },

    setVoiceTranscribing(msgId, transcribing) {
      const found = findMessage(msgId)
      if (found)
        found.list[found.index] = { ...found.list[found.index], voiceTranscribing: transcribing }
    },

    clearConversationMessages(conversationId) {
      messages.delete(conversationId)
    },

    updateMessageById(msgId, patch) {
      const found = findMessage(msgId)
      if (!found)
        return
      const prev = found.list[found.index]
      const updated = { ...prev, ...patch } as SdkUiMessage
      found.list[found.index] = updated

      if (patch.modified || patch.modifiedInfo)
        handlersRef()?.onMessageUpdated?.(updated)

      if (patch.status && patch.status !== prev.status) {
        handlersRef()?.onMessageStatusChanged?.({
          messageId: msgId,
          status: patch.status,
        })
      }
    },

    replaceMessageById(msgId, msg) {
      const found = findMessage(msgId)
      if (!found)
        return
      const sdkMsg = msg as SdkUiMessage
      found.list[found.index] = sdkMsg
      handlersRef()?.onMessageUpdated?.(sdkMsg)
    },

    addAtMeMessage(conversationId, msgId) {
      handlersRef()?.onAtMe?.({ conversationId, messageId: msgId })
    },

    updateMessageStatus(msgId, status) {
      const found = findMessage(msgId)
      if (!found)
        return
      found.list[found.index] = { ...found.list[found.index], status }
      handlersRef()?.onMessageStatusChanged?.({ messageId: msgId, status })
    },

    setMessagePinned(serverId, info) {
      const found = findMessage(serverId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.pinned = true
      msg.pinTime = info.pinTime
      msg.pinOperatorId = info.operatorId
    },

    setMessageUnpinned(serverId) {
      const found = findMessage(serverId)
      if (!found)
        return
      const msg = found.list[found.index]
      msg.pinned = false
    },

    deleteMessages(msgIds) {
      const idSet = new Set(msgIds)
      const deletedByConversation = new Map<string, string[]>()
      for (const [conversationId, list] of messages) {
        const remaining: SdkUiMessage[] = []
        for (const m of list) {
          const id = m.msgServerId || m.msgLocalId
          if (id && idSet.has(id)) {
            const arr = deletedByConversation.get(conversationId) ?? []
            arr.push(id)
            deletedByConversation.set(conversationId, arr)
          }
          else {
            remaining.push(m)
          }
        }
        messages.set(conversationId, remaining)
      }
      for (const [conversationId, ids] of deletedByConversation) {
        handlersRef()?.onMessagesDeleted?.({ messageIds: ids, conversationId })
      }
    },

    setSyncingMessages(value) {
      if (syncingMessages === value)
        return
      syncingMessages = value
      handlersRef()?.onSyncStatus?.({
        type: 'message',
        status: value ? 'syncing' : 'success',
      })
    },
  }
}
