import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import type { SdkMessage } from '@easemob/uikit-sdk-contract'
import { MESSAGE_STATUS } from '@easemob/uikit-core'
import type { MESSAGE_TYPE } from '@easemob/uikit-core'
import type { MessageStatus, TextMessageBody, UiMessage } from '@easemob/uikit-core'
import { toUiMessage } from '@easemob/uikit-core'
import { clearHistoryCursor } from '../composables/message-history-cursor'

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
  /** 会话消息缓存上限（opt-in）：超过时按 LRU 从最旧会话开始淘汰，默认 undefined = 不淘汰 */
  maxCachedConversations?: number
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
  /** 会话消息缓存上限（opt-in）：undefined = 不淘汰（Web 默认行为完全不变） */
  let maxCachedConversations: number | undefined

  /** 消息 ID → conversationId 索引（非响应式）：msgServerId / msgLocalId / localId 存在的都登记 */
  const msgIdIndex = new Map<string, string>()
  /** 会话 LRU 顺序（非响应式）：Map 键序即新旧顺序，最旧在前 */
  const conversationLru = new Map<string, true>()
  /** 最近一次 touch 的会话：淘汰时跳过，保护当前正在查看的会话 */
  let lastTouchedConversationId: string | null = null

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
    if (options?.maxCachedConversations !== undefined && options.maxCachedConversations > 0) {
      maxCachedConversations = options.maxCachedConversations
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

  /** 登记消息 ID 索引（msgServerId / msgLocalId / localId 存在的都登记） */
  function indexMessage(conversationId: string, msg: UiMessage) {
    for (const id of [msg.msgServerId, msg.msgLocalId, msg.localId]) {
      if (id)
        msgIdIndex.set(id, conversationId)
    }
  }

  /** 删除消息 ID 索引 */
  function unindexMessage(msg: UiMessage) {
    for (const id of [msg.msgServerId, msg.msgLocalId, msg.localId]) {
      if (id)
        msgIdIndex.delete(id)
    }
  }

  /** trim 裁剪 + 同步删除被裁掉消息的 ID 索引（trim 保持纯函数，索引副作用收敛在调用侧） */
  function trimWithIndexSync(list: UiMessage[]): UiMessage[] {
    if (list.length > maxMessageCount) {
      for (const m of list.slice(0, list.length - maxMessageCount))
        unindexMessage(m)
    }
    return trim(list)
  }

  /** 二分查找插入位置：list 按 timestamp 升序，相同 timestamp 插到已有元素之后（与稳定排序语义一致） */
  function findInsertIndex(list: UiMessage[], timestamp: number): number {
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (list[mid].timestamp <= timestamp)
        lo = mid + 1
      else
        hi = mid
    }
    return lo
  }

  /** 按 timestamp 有序插入：空列表或不早于末条时尾部拼接（O(1) 快路径），否则二分定位后构造新数组 */
  function insertSorted(list: UiMessage[], msg: UiMessage): UiMessage[] {
    if (list.length === 0 || msg.timestamp >= list[list.length - 1].timestamp)
      return [...list, msg]
    const pos = findInsertIndex(list, msg.timestamp)
    return [...list.slice(0, pos), msg, ...list.slice(pos)]
  }

  /** 在指定会话内按三种 ID 定位消息 */
  function findIndexInConversation(conversationId: string, msgId: string): number {
    return (messageMap.value[conversationId] || []).findIndex(
      m => m.msgServerId === msgId || m.msgLocalId === msgId || m.localId === msgId,
    )
  }

  function _findMessageById(msgId: string): { conversationId: string, index: number } | null {
    // 快路径：ID 索引命中 conversationId → 会话内定位
    const indexed = msgIdIndex.get(msgId)
    if (indexed !== undefined) {
      const index = findIndexInConversation(indexed, msgId)
      if (index > -1)
        return { conversationId: indexed, index }
      // 索引漂移（消息已删除/已不在该会话）：删索引后回退全表扫描，防假阴性
      msgIdIndex.delete(msgId)
    }
    // 回退：全表扫描（防索引漂移产生假阴性），命中则补登索引
    for (const conversationId in messageMap.value) {
      const index = findIndexInConversation(conversationId, msgId)
      if (index > -1) {
        msgIdIndex.set(msgId, conversationId)
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
      const newList = trimWithIndexSync(insertSorted(list, msg))
      messageMap.value[msg.conversationId] = newList
      // 极端情况：乱序旧消息插入满列表时自身被 trim 裁掉，不登记索引
      if (newList.includes(msg))
        indexMessage(msg.conversationId, msg)
    }
    touchConversation(msg.conversationId)
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
      const newList = trimWithIndexSync(insertSorted(list, uiMsg))
      messageMap.value[uiMsg.conversationId] = newList
      if (newList.includes(uiMsg))
        indexMessage(uiMsg.conversationId, uiMsg)
    }
    touchConversation(uiMsg.conversationId)
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
    const newMsg: UiMessage = {
      ...msg,
      isSelf: true,
      localId,
      translation: old.translation,
      showTranslation: old.showTranslation,
      voiceText: old.voiceText,
      showVoiceText: old.showVoiceText,
      requireGroupAck: old.requireGroupAck,
    }
    messageMap.value[conversationId] = [
      ...list.slice(0, index),
      newMsg,
      ...list.slice(index + 1),
    ]
    // 索引：localId 键保留（新消息仍携带该 localId），补登新消息的 serverId 等 ID
    indexMessage(conversationId, newMsg)
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
    const trimmed = trimWithIndexSync(merged)
    messageMap.value[conversationId] = trimmed
    // 批量登记新插入消息的 ID 索引（被 trim 裁掉的不登记）
    const keptSet = new Set(trimmed)
    for (const m of newMsgs) {
      if (keptSet.has(m))
        indexMessage(conversationId, m)
    }
    touchConversation(conversationId)
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
    const found = _findMessageById(msgId)
    if (!found)
      return
    const { conversationId, index } = found
    const list = messageMap.value[conversationId]
    unindexMessage(list[index])
    messageMap.value[conversationId] = [
      ...list.slice(0, index),
      ...list.slice(index + 1),
    ]
  }

  /** 批量删除消息 */
  function deleteMessages(msgIds: string[]) {
    const idSet = new Set(msgIds)
    for (const conversationId in messageMap.value) {
      const list = messageMap.value[conversationId]
      const removed: UiMessage[] = []
      const kept = list.filter((m) => {
        const hit = idSet.has(m.msgServerId) || idSet.has(m.msgLocalId) || idSet.has(m.localId || '')
        if (hit)
          removed.push(m)
        return !hit
      })
      // 无命中时不替换数组，避免无意义的响应式触发
      if (removed.length === 0)
        continue
      for (const m of removed)
        unindexMessage(m)
      messageMap.value[conversationId] = kept
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
        if (id) {
          delete parsedCombineMessageMap.value[id]
          msgIdIndex.delete(id)
        }
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
    // 会话级 LRU：该会话退出缓存顺序与淘汰保护位
    conversationLru.delete(conversationId)
    if (lastTouchedConversationId === conversationId)
      lastTouchedConversationId = null
  }

  /**
   * 标记会话为最近使用（移到 LRU 最新）；超出 maxCachedConversations 时从最旧会话开始淘汰。
   * 未配置 maxCachedConversations（默认）时为空操作，Web 行为完全不变。
   */
  function touchConversation(conversationId: string) {
    if (!maxCachedConversations || maxCachedConversations <= 0)
      return
    conversationLru.delete(conversationId)
    conversationLru.set(conversationId, true)
    lastTouchedConversationId = conversationId
    // 超限淘汰：从最旧开始；跳过最近一次 touch 的会话（保护当前正在查看的会话）
    while (conversationLru.size > maxCachedConversations) {
      const oldestEntry = conversationLru.keys().next()
      if (oldestEntry.done || oldestEntry.value === lastTouchedConversationId)
        break
      conversationLru.delete(oldestEntry.value)
      evictConversationMessages(oldestEntry.value)
    }
  }

  /**
   * 淘汰单个会话的消息缓存：复用 clearConversationMessages 的清理面
   * （messageMap / pinnedMessageMap / atMeMessageMap / sendingMetaMap /
   * parsedCombineMessageMap 关联条目 + ID 索引），并重置历史翻页游标，
   * 回访该会话时由 chat 的「本地无消息才拉首屏」逻辑走 fetchHistory 漫游回源。
   */
  function evictConversationMessages(conversationId: string) {
    clearConversationMessages(conversationId)
    clearHistoryCursor(conversationId)
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
    msgIdIndex.clear()
    conversationLru.clear()
    lastTouchedConversationId = null
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
    touchConversation,
  }
})
