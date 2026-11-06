import type {
  UiConversation,
} from '@easemob-community/uikit-sdk-contract'
import type { EventStores } from '../../event/types'
import type { HandlersRef } from './types'

/** 创建会话 store */
export function createConversationStore(handlersRef: HandlersRef): EventStores['conversation'] {
  let conversationList: UiConversation[] = []
  let currentConversationId: string | null = null
  let conversationsLoaded = false

  function emitChange() {
    handlersRef()?.onConversationChange?.(conversationList)
  }

  return {
    get conversationList() {
      return conversationList
    },
    get currentConversationId() {
      return currentConversationId
    },
    get conversationsLoaded() {
      return conversationsLoaded
    },

    setList(list) {
      conversationList = list
      emitChange()
    },

    setCurrentConversationId(id) {
      currentConversationId = id
    },

    setSyncing(_syncing) {
      // domain 层可能调用，但同步状态事件由 setSyncStatusListener 处理
    },

    delete(id) {
      conversationList = conversationList.filter(c => c.id !== id)
      handlersRef()?.onConversationDeleted?.(id)
    },

    update(id, patch) {
      const idx = conversationList.findIndex(c => c.id === id)
      if (idx < 0)
        return
      conversationList[idx] = { ...conversationList[idx], ...patch }
      emitChange()
      handlersRef()?.onConversationUpdated?.({ id, conversation: patch })
    },

    setConversationList(list) {
      this.setList(list)
    },

    addConversation(cvs) {
      const idx = conversationList.findIndex(c => c.id === cvs.id)
      if (idx >= 0)
        conversationList[idx] = cvs
      else
        conversationList.push(cvs)
      emitChange()
    },

    deleteConversation(id) {
      this.delete(id)
    },

    updateConversation(id, patch) {
      this.update(id, patch)
    },

    setConversationsLoaded(v) {
      conversationsLoaded = v
    },

    setSyncingConversations(_v) {
      // 同步状态由 use-sync-status 监听器发出
    },

    setTyping(conversationId, userId) {
      handlersRef()?.onTyping?.({ conversationId, userId })
    },

    setAtMe(_conversationId, _hasAtMe) {
      // 具体 messageId 由 message store.addAtMeMessage 触发 onAtMe
    },

    updateUnreadCount(id, count) {
      this.update(id, { unreadCount: count })
    },
  }
}
