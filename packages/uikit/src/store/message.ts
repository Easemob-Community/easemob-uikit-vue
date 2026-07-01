import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import type { MessageStatus, TextMessageBody, UiMessage } from '../sdk/types'
import { toUiMessage } from '../sdk/adapter/message-adapter'

/** 按消息类型提取具体的 UiMessage 子类型（用于组件 props 精确类型） */
export type TextMessageType = UiMessage & { type: 'text', body: { content: string } }
export type ImageMessageType = UiMessage & { type: 'image' }
export type VoiceMessageType = UiMessage & { type: 'voice' }
export type VideoMessageType = UiMessage & { type: 'video' }
export type FileMessageType = UiMessage & { type: 'file' }
export type CombineMessageType = UiMessage & { type: 'combine' }
export type CustomMessageType = UiMessage & { type: 'custom' }
export type LocationMessageType = UiMessage & { type: 'location' }

/** MessageStore 配置选项 */
export interface MessageStoreOptions {
  /** 单个会话最大消息存储数，默认 300 */
  maxMessageCount?: number
}

export const useMessageStore = defineStore('message', () => {
  const messageMap = ref<Record<string, UiMessage[]>>({})
  const sendingMetaMap = ref<Record<string, { sdkMsg: SdkMessage, timestamp: number }>>({})
  const pinnedMessageMap = ref<Record<string, UiMessage[]>>({})
  const parsedCombineMessageMap = ref<Record<string, UiMessage[]>>({})
  const atMeMessageMap = ref<Record<string, string[]>>({})

  let maxMessageCount = 300

  function setOptions(options?: MessageStoreOptions) {
    if (options?.maxMessageCount !== undefined && options.maxMessageCount > 0) {
      maxMessageCount = options.maxMessageCount
    }
  }

  function getMessages(conversationId: string): UiMessage[] {
    return messageMap.value[conversationId] || []
  }

  function getPinnedMessages(conversationId: string): UiMessage[] {
    return pinnedMessageMap.value[conversationId] || []
  }

  function getParsedCombineMessages(messageId: string): UiMessage[] {
    return parsedCombineMessageMap.value[messageId] || []
  }

  function setParsedCombineMessages(messageId: string, messages: UiMessage[]) {
    parsedCombineMessageMap.value[messageId] = messages
  }

  function getAtMeMessages(conversationId: string): string[] {
    return atMeMessageMap.value[conversationId] || []
  }

  function trim(list: UiMessage[]): UiMessage[] {
    if (list.length <= maxMessageCount)
      return list
    return list.slice(-maxMessageCount)
  }

  function _findMessageById(msgId: string): { list: UiMessage[], index: number } | null {
    for (const conversationId in messageMap.value) {
      const index = messageMap.value[conversationId].findIndex(
        m => m.msgServerId === msgId || m.msgLocalId === msgId || m.localId === msgId,
      )
      if (index > -1) {
        return { list: messageMap.value[conversationId], index }
      }
    }
    return null
  }

  /** 添加一条消息（通常来自 SDK 事件） */
  function addMessage(msg: UiMessage) {
    const list = messageMap.value[msg.conversationId] || []
    const exists = list.find(
      m => m.msgServerId === msg.msgServerId || m.msgLocalId === msg.msgLocalId,
    )
    if (!exists) {
      list.push(msg)
      list.sort((a, b) => a.timestamp - b.timestamp)
      messageMap.value[msg.conversationId] = trim(list)
    }
  }

  /** 发送前：将 SDK Message 以 sending 状态加入 store */
  function addSendingMessage(localId: string, sdkMsg: SdkMessage) {
    sendingMetaMap.value[localId] = { sdkMsg, timestamp: Date.now() }

    const currentUserId = sdkMsg.from
    const uiMsg: UiMessage = {
      ...toUiMessage(sdkMsg, currentUserId),
      status: 'sending',
      isSelf: true,
    }

    const list = messageMap.value[uiMsg.conversationId] || []
    const exists = list.find(m => m.msgLocalId === localId)
    if (!exists) {
      list.push(uiMsg)
      list.sort((a, b) => a.timestamp - b.timestamp)
      messageMap.value[uiMsg.conversationId] = trim(list)
    }
  }

  /** 发送成功后替换本地 sending 消息 */
  function replaceWithSent(localId: string, msg: UiMessage) {
    delete sendingMetaMap.value[localId]

    const found = _findMessageById(localId)
    if (!found) {
      // 本地没有则直接添加
      addMessage(msg)
      return
    }

    const { list, index } = found
    const old = list[index]
    list[index] = {
      ...msg,
      isSelf: true,
      localId,
      translation: old.translation,
      showTranslation: old.showTranslation,
      requireGroupAck: old.requireGroupAck,
    }
  }

  /** 更新附件上传进度 */
  function updateUploadProgress(localId: string, _percent: number) {
    const found = _findMessageById(localId)
    if (found) {
      found.list[found.index] = { ...found.list[found.index] } as UiMessage
    }
  }

  /** 标记发送失败 */
  function markFailed(localId: string, reason: string) {
    delete sendingMetaMap.value[localId]
    const found = _findMessageById(localId)
    if (found) {
      found.list[found.index] = {
        ...found.list[found.index],
        status: 'failed',
        failReason: reason,
      }
    }
  }

  /** 批量插入历史消息到头部 */
  function prependMessages(conversationId: string, msgs: UiMessage[]) {
    const existing = messageMap.value[conversationId] || []
    const existingIds = new Set(
      existing.flatMap(m => [m.msgServerId, m.msgLocalId].filter(Boolean)),
    )
    const newMsgs = msgs.filter(
      m => !existingIds.has(m.msgServerId) && !existingIds.has(m.msgLocalId),
    )
    const merged = [...newMsgs, ...existing]
    merged.sort((a, b) => a.timestamp - b.timestamp)
    messageMap.value[conversationId] = trim(merged)
  }

  /** 按消息 ID 局部更新 */
  function updateMessageById(msgId: string, patch: Partial<UiMessage>) {
    const found = _findMessageById(msgId)
    if (found) {
      found.list[found.index] = { ...found.list[found.index], ...patch }
    }
  }

  /** 按消息 ID 完整替换 */
  function replaceMessageById(msgId: string, msg: UiMessage) {
    const found = _findMessageById(msgId)
    if (found) {
      found.list[found.index] = msg
    }
  }

  /** 更新消息状态（用于送达/已读回执） */
  function updateMessageStatus(msgId: string, status: MessageStatus) {
    updateMessageById(msgId, { status })
  }

  /** 撤回消息 */
  function recallMessage(serverId: string, operatorId?: string) {
    const found = _findMessageById(serverId)
    const originalBody = found?.list[found.index].body as TextMessageBody | undefined
    updateMessageById(serverId, {
      recalled: true,
      recalledBy: operatorId,
      originalMsg: originalBody?.content,
    })
  }

  /** 应用编辑后的消息 */
  function applyModifiedMessage(msg: UiMessage) {
    const found = _findMessageById(msg.msgServerId)
    if (found) {
      found.list[found.index] = { ...msg }
    }
  }

  /** 按服务端消息 ID 完整更新消息 */
  function updateMessage(serverId: string, msg: UiMessage) {
    replaceMessageById(serverId, msg)
  }

  /** 删除单条消息 */
  function deleteMessage(msgId: string) {
    for (const conversationId in messageMap.value) {
      const list = messageMap.value[conversationId]
      const index = list.findIndex(
        m => m.msgServerId === msgId || m.msgLocalId === msgId || m.localId === msgId,
      )
      if (index > -1) {
        list.splice(index, 1)
        break
      }
    }
  }

  /** 批量删除消息 */
  function deleteMessages(msgIds: string[]) {
    const idSet = new Set(msgIds)
    for (const conversationId in messageMap.value) {
      messageMap.value[conversationId] = messageMap.value[conversationId].filter(
        m => !idSet.has(m.msgServerId) && !idSet.has(m.msgLocalId) && !idSet.has(m.localId || ''),
      )
    }
  }

  /** 设置会话置顶消息列表 */
  function setPinnedMessages(conversationId: string, msgs: UiMessage[]) {
    pinnedMessageMap.value[conversationId] = msgs
  }

  /** 标记单条消息为置顶 */
  function setMessagePinned(serverId: string, info: { operatorId: string, pinTime: number }) {
    updateMessageById(serverId, {
      pinned: true,
      pinTime: info.pinTime,
      pinOperatorId: info.operatorId,
    })
  }

  /** 标记单条消息取消置顶 */
  function setMessageUnpinned(serverId: string) {
    updateMessageById(serverId, {
      pinned: false,
      pinTime: undefined,
      pinOperatorId: undefined,
    })
  }

  /** 添加@我的消息记录 */
  function addAtMeMessage(conversationId: string, msgId: string) {
    const list = atMeMessageMap.value[conversationId] || []
    if (!list.includes(msgId)) {
      list.push(msgId)
      atMeMessageMap.value[conversationId] = list
    }
  }

  /** 清空某会话的@我消息记录 */
  function clearAtMeMessages(conversationId: string) {
    delete atMeMessageMap.value[conversationId]
  }

  /** 设置翻译中状态 */
  function setTranslating(msgId: string, translating: boolean) {
    updateMessageById(msgId, { translating })
  }

  /** 设置翻译结果 */
  function setTranslation(msgId: string, translation: { text: string, to: string }) {
    updateMessageById(msgId, {
      translation,
      showTranslation: true,
      translating: false,
    })
  }

  /** 切换译文/原文展示 */
  function toggleTranslation(msgId: string) {
    const found = _findMessageById(msgId)
    if (found) {
      found.list[found.index] = {
        ...found.list[found.index],
        showTranslation: !found.list[found.index].showTranslation,
      }
    }
  }

  /** 清空所有消息数据 */
  function clearMessages() {
    messageMap.value = {}
    sendingMetaMap.value = {}
    pinnedMessageMap.value = {}
    parsedCombineMessageMap.value = {}
    atMeMessageMap.value = {}
  }

  return {
    messageMap: computed(() => messageMap.value),
    sendingMetaMap: computed(() => sendingMetaMap.value),
    pinnedMessageMap: computed(() => pinnedMessageMap.value),
    parsedCombineMessageMap: computed(() => parsedCombineMessageMap.value),
    atMeMessageMap: computed(() => atMeMessageMap.value),
    setOptions,
    getMessages,
    getPinnedMessages,
    getParsedCombineMessages,
    setParsedCombineMessages,
    getAtMeMessages,
    addMessage,
    addSendingMessage,
    replaceWithSent,
    updateUploadProgress,
    markFailed,
    prependMessages,
    updateMessageById,
    replaceMessageById,
    updateMessageStatus,
    updateStatusByServerId: updateMessageStatus,
    recallMessage,
    applyModifiedMessage,
    updateMessage,
    deleteMessage,
    deleteMessages,
    setPinnedMessages,
    setMessagePinned,
    setMessageUnpinned,
    addAtMeMessage,
    clearAtMeMessages,
    clearAtMe: clearAtMeMessages,
    setTranslating,
    setTranslation,
    toggleTranslation,
    clearMessages,
  }
})
