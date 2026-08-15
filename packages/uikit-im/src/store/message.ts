import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import { MESSAGE_STATUS } from '@easemob/uikit-core'
import type { MESSAGE_TYPE } from '@easemob/uikit-core'
import type { MessageStatus, TextMessageBody, UiMessage } from '@easemob/uikit-core'
import { toUiMessage } from '../sdk/adapter/message-adapter'

/** 按消息类型提取具体的 UiMessage 子类型（用于组件 props 精确类型） */
export type TextMessageType = UiMessage & { type: typeof MESSAGE_TYPE.TEXT, body: { content: string } }
export type ImageMessageType = UiMessage & { type: typeof MESSAGE_TYPE.IMAGE }
export type VoiceMessageType = UiMessage & { type: typeof MESSAGE_TYPE.VOICE }
export type VideoMessageType = UiMessage & { type: typeof MESSAGE_TYPE.VIDEO }
export type FileMessageType = UiMessage & { type: typeof MESSAGE_TYPE.FILE }
export type CombineMessageType = UiMessage & { type: typeof MESSAGE_TYPE.COMBINE }
export type CustomMessageType = UiMessage & { type: typeof MESSAGE_TYPE.CUSTOM }
export type LocationMessageType = UiMessage & { type: typeof MESSAGE_TYPE.LOCATION }

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
  /** 群消息已读成员缓存：key = `${groupId}:${messageId}` */
  const groupMessageReadUsersMap = ref<Record<string, string[]>>({})
  const atMeMessageMap = ref<Record<string, string[]>>({})
  /** 离线消息同步中（登录后 SDK 拉取离线历史阶段） */
  const isSyncingMessages = ref(false)

  let maxMessageCount = 300

  /** 消息状态序号：状态只升不降（sending < sent < delivered < read），failed 与 sent 同级 */
  const STATUS_ORDER: Record<MessageStatus, number> = {
    sending: 0,
    sent: 1,
    failed: 1,
    delivered: 2,
    read: 3,
  }

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

  function getGroupMessageReadUsers(groupId: string, messageId: string): string[] {
    return groupMessageReadUsersMap.value[`${groupId}:${messageId}`] || []
  }

  function setGroupMessageReadUsers(groupId: string, messageId: string, userIds: string[]) {
    groupMessageReadUsersMap.value[`${groupId}:${messageId}`] = userIds
  }

  function setSyncingMessages(value: boolean) {
    isSyncingMessages.value = value
  }

  function getAtMeMessages(conversationId: string): string[] {
    return atMeMessageMap.value[conversationId] || []
  }

  function trim(list: UiMessage[]): UiMessage[] {
    if (list.length <= maxMessageCount)
      return list
    return list.slice(-maxMessageCount)
  }

  function _findMessageById(msgId: string): { conversationId: string, index: number } | null {
    for (const conversationId in messageMap.value) {
      const index = messageMap.value[conversationId].findIndex(
        m => m.msgServerId === msgId || m.msgLocalId === msgId || m.localId === msgId,
      )
      if (index > -1) {
        return { conversationId, index }
      }
    }
    return null
  }

  function _updateMessageById(msgId: string, updater: (msg: UiMessage) => UiMessage): boolean {
    const found = _findMessageById(msgId)
    if (!found)
      return false
    const { conversationId, index } = found
    const list = messageMap.value[conversationId]
    messageMap.value[conversationId] = [
      ...list.slice(0, index),
      updater(list[index]),
      ...list.slice(index + 1),
    ]
    return true
  }

  /** 添加一条消息（通常来自 SDK 事件） */
  function addMessage(msg: UiMessage) {
    const list = messageMap.value[msg.conversationId] || []
    const exists = list.find(
      m =>
        (msg.msgServerId && m.msgServerId === msg.msgServerId)
        || (msg.msgLocalId && m.msgLocalId === msg.msgLocalId),
    )
    if (!exists) {
      const newList = [...list, msg].sort((a, b) => a.timestamp - b.timestamp)
      messageMap.value[msg.conversationId] = trim(newList)
    }
  }

  /** 发送前：将 SDK Message 以 sending 状态加入 store */
  function addSendingMessage(localId: string, sdkMsg: SdkMessage) {
    // markRaw：合并消息的 sdkMsg 携带完整 messageList 子消息图，
    // 深响应式包装会产生大量无用 proxy，阻断潜在的重渲染/卡死链路
    sendingMetaMap.value[localId] = { sdkMsg: markRaw(sdkMsg), timestamp: Date.now() }

    const currentUserId = sdkMsg.from
    const uiMsg: UiMessage = {
      ...toUiMessage(sdkMsg, currentUserId),
      status: MESSAGE_STATUS.SENDING,
      isSelf: true,
      // 请求了已读回执的群消息需要展示已读人数标注（replaceWithSent 会保留该字段）
      requireGroupAck: sdkMsg.needReadReceipt === true ? true : undefined,
    }

    const list = messageMap.value[uiMsg.conversationId] || []
    const exists = list.find(
      m =>
        (uiMsg.msgServerId && m.msgServerId === uiMsg.msgServerId)
        || (uiMsg.msgLocalId && m.msgLocalId === uiMsg.msgLocalId),
    )
    if (!exists) {
      const newList = [...list, uiMsg].sort((a, b) => a.timestamp - b.timestamp)
      messageMap.value[uiMsg.conversationId] = trim(newList)
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

    const { conversationId, index } = found
    const list = messageMap.value[conversationId]
    const old = list[index]
    messageMap.value[conversationId] = [
      ...list.slice(0, index),
      {
        ...msg,
        isSelf: true,
        localId,
        translation: old.translation,
        showTranslation: old.showTranslation,
        voiceText: old.voiceText,
        showVoiceText: old.showVoiceText,
        requireGroupAck: old.requireGroupAck,
      },
      ...list.slice(index + 1),
    ]
  }

  /** 更新附件上传进度 */
  function updateUploadProgress(localId: string, percent: number) {
    _updateMessageById(localId, msg => ({ ...msg, progress: percent }))
  }

  /** 标记发送失败 */
  function markFailed(localId: string, reason: string) {
    delete sendingMetaMap.value[localId]
    _updateMessageById(localId, msg => ({
      ...msg,
      status: MESSAGE_STATUS.FAILED,
      failReason: reason,
    }))
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
    // UiMessage 是 SDK 消息与本地通知消息的联合，union spread 推断不出兼容类型，需显式断言
    _updateMessageById(msgId, msg => ({ ...msg, ...patch }) as UiMessage)
  }

  /** 按消息 ID 完整替换 */
  function replaceMessageById(msgId: string, msg: UiMessage) {
    _updateMessageById(msgId, () => msg)
  }

  /** 更新消息状态（用于送达/已读回执） */
  function updateMessageStatus(msgId: string, status: MessageStatus) {
    _updateMessageById(msgId, (msg) => {
      // 状态只升不降：已读回执可能先于送达回执到达，避免 read 被回退成 delivered
      if (STATUS_ORDER[msg.status] > STATUS_ORDER[status])
        return msg
      return { ...msg, status }
    })
  }

  /** 撤回消息 */
  function recallMessage(serverId: string, operatorId?: string) {
    const found = _findMessageById(serverId)
    const originalBody = found
      ? (messageMap.value[found.conversationId][found.index].body as TextMessageBody | undefined)
      : undefined
    updateMessageById(serverId, {
      recalled: true,
      recalledBy: operatorId,
      originalMsg: originalBody?.content,
    })
  }

  /** 应用编辑后的消息 */
  function applyModifiedMessage(msg: UiMessage) {
    _updateMessageById(msg.msgServerId, () => ({ ...msg }))
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
        messageMap.value[conversationId] = [
          ...list.slice(0, index),
          ...list.slice(index + 1),
        ]
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
      atMeMessageMap.value[conversationId] = [...list, msgId]
    }
  }

  /** 清空某会话的@我消息记录 */
  function clearAtMeMessages(conversationId: string) {
    delete atMeMessageMap.value[conversationId]
  }

  /** 清空指定会话的所有消息（本地） */
  function clearConversationMessages(conversationId: string) {
    // parsedCombineMessageMap 以“合并消息的消息 ID”为键而非 conversationId，
    // 需在删除消息前按该会话内消息 ID 遍历清理对应的合并消息缓存条目
    const msgs = messageMap.value[conversationId] || []
    for (const m of msgs) {
      for (const id of [m.msgServerId, m.msgLocalId, m.localId]) {
        if (id)
          delete parsedCombineMessageMap.value[id]
      }
    }
    delete messageMap.value[conversationId]
    delete pinnedMessageMap.value[conversationId]
    delete atMeMessageMap.value[conversationId]
    const relatedSending = Object.entries(sendingMetaMap.value)
      .filter(([, meta]) => meta.sdkMsg.conversationId === conversationId)
      .map(([localId]) => localId)
    for (const localId of relatedSending) {
      delete sendingMetaMap.value[localId]
    }
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
    _updateMessageById(msgId, msg => ({
      ...msg,
      showTranslation: !msg.showTranslation,
    }))
  }

  /** 设置语音转文字中状态 */
  function setVoiceTranscribing(msgId: string, voiceTranscribing: boolean) {
    updateMessageById(msgId, { voiceTranscribing })
  }

  /** 设置语音转文字结果 */
  function setVoiceText(msgId: string, voiceText: { text: string }) {
    updateMessageById(msgId, {
      voiceText,
      showVoiceText: true,
      voiceTranscribing: false,
    })
  }

  /** 切换语音转文字结果/原文展示 */
  function toggleVoiceText(msgId: string) {
    _updateMessageById(msgId, msg => ({
      ...msg,
      showVoiceText: !msg.showVoiceText,
    }))
  }

  /** 清空所有消息数据 */
  function clearMessages() {
    messageMap.value = {}
    sendingMetaMap.value = {}
    pinnedMessageMap.value = {}
    parsedCombineMessageMap.value = {}
    groupMessageReadUsersMap.value = {}
    atMeMessageMap.value = {}
    isSyncingMessages.value = false
  }

  return {
    messageMap: computed(() => messageMap.value),
    sendingMetaMap: computed(() => sendingMetaMap.value),
    pinnedMessageMap: computed(() => pinnedMessageMap.value),
    parsedCombineMessageMap: computed(() => parsedCombineMessageMap.value),
    groupMessageReadUsersMap: computed(() => groupMessageReadUsersMap.value),
    atMeMessageMap: computed(() => atMeMessageMap.value),
    isSyncingMessages: computed(() => isSyncingMessages.value),
    setSyncingMessages,
    setOptions,
    getMessages,
    getPinnedMessages,
    getParsedCombineMessages,
    setParsedCombineMessages,
    getGroupMessageReadUsers,
    setGroupMessageReadUsers,
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
    setVoiceTranscribing,
    setVoiceText,
    toggleVoiceText,
    clearMessages,
    clearConversationMessages,
  }
})
