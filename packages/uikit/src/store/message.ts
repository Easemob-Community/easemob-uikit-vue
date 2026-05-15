import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { EasemobChat } from 'easemob-websdk'
import type { MessageStatusValue } from '../constants'
import { MESSAGE_STATUS } from '../constants'

/** UI 层对 SDK 消息的扩展字段 */
export interface MessageUiExtension {
  /** UI 计算字段：会话 ID（单聊取对方 ID，群聊取群 ID） */
  conversationId: string
  /** UI 计算字段：是否为自己发送的消息 */
  isSelf: boolean
  /** UI 状态字段：消息发送/送达/已读状态 */
  status: MessageStatusValue
  /** 时间戳，对齐 SDK time 字段 */
  timestamp: number
  /** 群已读人数（仅群聊 allowGroupAck 消息，发送方可查看） */
  groupReadCount?: number
  /** 群成员总数（用于计算未读人数，仅群聊 allowGroupAck 消息） */
  groupMemberCount?: number
  /** 是否需要群已读回执（来自 msgConfig.allowGroupAck） */
  requireGroupAck?: boolean
  /** 消息是否已被撤回 */
  recalled?: boolean
  /** 撤回操作者 ID（自己撤回或对方/管理员撤回） */
  recalledBy?: string
  /** 文本消息撤回后保留的原始内容，用于重新编辑 */
  originalMsg?: string
  /** 环信服务器消息 ID（撤回等操作需要） */
  mid?: string
  /** 是否被编辑过 */
  modified?: boolean
  /** 编辑信息：最后一次编辑者、编辑次数（SDK 最多 5 次）、编辑时间 */
  modifiedInfo?: {
    operatorId: string
    operationCount: number
    operationTime: number
  }
  /** 是否被置顶 */
  pinned?: boolean
  /** 置顶时间（毫秒） */
  pinTime?: number
  /** 置顶操作人 ID */
  pinOperatorId?: string
  /** 翻译结果（仅文本消息使用） */
  translation?: { text: string, to: string }
  /** 是否优先展示译文 */
  showTranslation?: boolean
  /** 翻译请求中 */
  translating?: boolean
  /** 消息发送失败原因 */
  failReason?: string
}

/**
 * UI 层消息类型：在 SDK 原生消息体基础上扩展 UI 状态字段
 *
 * - 直接继承 SDK ExcludeAckMessageBody（排除 read/delivery/channel 回执类型）
 * - 各消息类型的专有字段保留在顶层（msg, url, thumb, length, filename 等），保持 SDK 原生类型安全
 * - 新增 conversationId / isSelf / status / timestamp 为 UI 计算/状态字段
 */
export type Message = EasemobChat.ExcludeAckMessageBody & MessageUiExtension

/** 按消息类型提取具体的 Message 子类型（用于组件 props 精确类型） */
export type TextMessageType = Extract<Message, { type: 'txt' }>
export type ImgMessageType = Extract<Message, { type: 'img' }>
export type AudioMessageType = Extract<Message, { type: 'audio' }>
export type VideoMessageType = Extract<Message, { type: 'video' }>
export type FileMessageType = Extract<Message, { type: 'file' }>

export const useMessageStore = defineStore('message', () => {
  const messageMap = ref<Record<string, Message[]>>({})
  const sendingMessages = ref<Set<string>>(new Set())
  /** 会话维度的置顶消息列表（按 pinTime 降序） */
  const pinnedMessageMap = ref<Record<string, Message[]>>({})
  /**
   * 合并消息解析缓存：key = 合并消息 id，value = 解析后的子消息列表。
   * 避免重复调用 downloadAndParseCombineMessage。
   */
  const parsedCombineMessageMap = ref<Record<string, EasemobChat.ExcludeAckMessageBody[]>>({})

  function getMessages(conversationId: string): Message[] {
    return messageMap.value[conversationId] || []
  }

  function getPinnedMessages(conversationId: string): Message[] {
    return pinnedMessageMap.value[conversationId] || []
  }

  /** 在所有会话中按 id/mid 定位消息 */
  function _findMessageById(msgId: string): Message | undefined {
    for (const key in messageMap.value) {
      const msg = messageMap.value[key].find((m: Message) => m.id === msgId || m.mid === msgId)
      if (msg) return msg
    }
    return undefined
  }

  function addMessage(msg: Message) {
    const list = messageMap.value[msg.conversationId] || []
    const exists = list.find((m: Message) => m.id === msg.id)
    if (!exists) {
      list.push(msg)
      // 按 timestamp 升序排列，确保消息顺序正确
      list.sort((a, b) => a.timestamp - b.timestamp)
      messageMap.value[msg.conversationId] = list
    }
  }

  /** 批量插入历史消息到头部（按 timestamp 升序去重合并） */
  function prependMessages(conversationId: string, messages: Message[]) {
    const existing = messageMap.value[conversationId] || []
    const existingIds = new Set(existing.map((m: Message) => m.id))
    const newMsgs = messages.filter((m: Message) => !existingIds.has(m.id))
    const merged = [...newMsgs, ...existing]
    merged.sort((a, b) => a.timestamp - b.timestamp)
    messageMap.value[conversationId] = merged
  }

  /** 按 id 查找并局部更新消息 */
  function updateMessageById(msgId: string, patch: Partial<Message>) {
    for (const key in messageMap.value) {
      const msg = messageMap.value[key].find((m: Message) => m.id === msgId)
      if (msg) {
        Object.assign(msg, patch)
        break
      }
    }
  }

  /**
   * 用服务器返回的完整消息体替换本地消息
   * - 保留 UI 扩展字段（conversationId, isSelf, status, timestamp 等）
   * - 继承服务器补全的字段（mid, thumb, url 等）
   */
  function replaceMessageById(msgId: string, serverMsg: EasemobChat.ExcludeAckMessageBody) {
    for (const key in messageMap.value) {
      const msg = messageMap.value[key].find((m: Message) => m.id === msgId)
      if (msg) {
        const preserved: MessageUiExtension = {
          conversationId: msg.conversationId,
          isSelf: msg.isSelf,
          status: MESSAGE_STATUS.SENT,
          timestamp: msg.timestamp,
          groupReadCount: msg.groupReadCount,
          groupMemberCount: msg.groupMemberCount,
          requireGroupAck: msg.requireGroupAck,
        }
        const replaced: Message = {
          ...serverMsg,
          ...preserved,
          mid: serverMsg.id,
        } as Message
        const index = messageMap.value[key].findIndex((m: Message) => m.id === msgId)
        if (index !== -1) {
          messageMap.value[key][index] = replaced
        }
        break
      }
    }
  }

  function updateMessageStatus(msgId: string, status: Message['status']) {
    updateMessageById(msgId, { status })
  }

  /**
   * 应用 SDK 返回的修改后消息体：按 id/mid 命中本地消息，
   * 使用 serverMsg 覆盖内容字段（msg/ext 等）同时保留 UI 扩展字段，
   * 并标记 modified=true、记录 modifiedInfo。
   */
  function applyModifiedMessage(
    serverMsg: EasemobChat.ExcludeAckMessageBody,
    info?: { operatorId?: string, operationCount?: number, operationTime?: number },
  ) {
    const msgId = serverMsg.id
    for (const key in messageMap.value) {
      const list = messageMap.value[key]
      const index = list.findIndex((m: Message) => m.id === msgId || m.mid === msgId)
      if (index === -1) continue
      const local = list[index]
      const preserved: MessageUiExtension = {
        conversationId: local.conversationId,
        isSelf: local.isSelf,
        status: local.status,
        timestamp: local.timestamp,
        groupReadCount: local.groupReadCount,
        groupMemberCount: local.groupMemberCount,
        requireGroupAck: local.requireGroupAck,
        recalled: local.recalled,
        recalledBy: local.recalledBy,
        originalMsg: local.originalMsg,
        mid: local.mid || serverMsg.id,
        pinned: local.pinned,
        pinTime: local.pinTime,
        pinOperatorId: local.pinOperatorId,
        translation: undefined,
        showTranslation: false,
        translating: false,
        modified: true,
        modifiedInfo: info
          ? {
              operatorId: info.operatorId || '',
              operationCount: info.operationCount ?? (local.modifiedInfo?.operationCount ?? 0) + 1,
              operationTime: info.operationTime || Date.now(),
            }
          : {
              operatorId: local.modifiedInfo?.operatorId || '',
              operationCount: (local.modifiedInfo?.operationCount ?? 0) + 1,
              operationTime: Date.now(),
            },
      }
      const replaced: Message = {
        ...serverMsg,
        ...preserved,
      } as Message
      list[index] = replaced
      // 同步置顶镜像
      const cvsId = local.conversationId
      const pinList = pinnedMessageMap.value[cvsId]
      if (pinList) {
        const pinIdx = pinList.findIndex((m: Message) => m.id === msgId || m.mid === msgId)
        if (pinIdx !== -1) pinList[pinIdx] = replaced
      }
      break
    }
  }

  /** 标记消息为已置顶，同时插入 pinnedMessageMap（以 pinTime 降序去重） */
  function setMessagePinned(
    msgId: string,
    pinInfo: { operatorId: string, pinTime: number },
  ) {
    const target = _findMessageById(msgId)
    if (!target) return
    target.pinned = true
    target.pinTime = pinInfo.pinTime
    target.pinOperatorId = pinInfo.operatorId
    const cvsId = target.conversationId
    const list = pinnedMessageMap.value[cvsId] || []
    const exists = list.find((m: Message) => m.id === target.id || m.mid === target.mid)
    if (!exists) {
      list.unshift(target)
      list.sort((a, b) => (b.pinTime || 0) - (a.pinTime || 0))
      pinnedMessageMap.value[cvsId] = list
    }
  }

  /** 取消置顶标记，同时从 pinnedMessageMap 移除 */
  function setMessageUnpinned(msgId: string) {
    const target = _findMessageById(msgId)
    if (target) {
      target.pinned = false
      target.pinTime = undefined
      target.pinOperatorId = undefined
      const cvsId = target.conversationId
      const list = pinnedMessageMap.value[cvsId]
      if (list) {
        pinnedMessageMap.value[cvsId] = list.filter((m: Message) => m.id !== target.id && m.mid !== target.mid)
      }
      return
    }
    // 未在主列表命中：仅从 pinnedMessageMap 移除
    for (const key in pinnedMessageMap.value) {
      pinnedMessageMap.value[key] = pinnedMessageMap.value[key].filter(
        (m: Message) => m.id !== msgId && m.mid !== msgId,
      )
    }
  }

  /** 覆写会话的置顶消息列表（拉取服务端列表后调用） */
  function setPinnedMessages(conversationId: string, messages: Message[]) {
    pinnedMessageMap.value[conversationId] = [...messages].sort(
      (a, b) => (b.pinTime || 0) - (a.pinTime || 0),
    )
    // 同步主列表 pinned 标识
    const list = messageMap.value[conversationId] || []
    const pinIds = new Set(messages.map((m: Message) => m.id))
    list.forEach((m: Message) => {
      const isPinned = pinIds.has(m.id) || (m.mid ? pinIds.has(m.mid) : false)
      if (isPinned) {
        const matched = messages.find(p => p.id === m.id || p.id === m.mid)
        m.pinned = true
        m.pinTime = matched?.pinTime
        m.pinOperatorId = matched?.pinOperatorId
      }
    })
  }

  /** 设置翻译结果与展示状态 */
  function setTranslation(msgId: string, translation: { text: string, to: string }) {
    updateMessageById(msgId, { translation, showTranslation: true, translating: false })
  }

  /** 切换译文/原文展示 */
  function toggleTranslation(msgId: string) {
    const msg = _findMessageById(msgId)
    if (!msg) return
    msg.showTranslation = !msg.showTranslation
  }

  /** 设置翻译请求 loading 状态 */
  function setTranslating(msgId: string, flag: boolean) {
    updateMessageById(msgId, { translating: flag })
  }

  /** 撤回消息：标记 recalled 并保留 originalMsg（文本类型） */
  function recallMessage(msgId: string, recalledBy: string) {
    for (const key in messageMap.value) {
      const msg = messageMap.value[key].find((m: Message) => m.id === msgId || m.mid === msgId)
      if (msg) {
        const patch: Partial<Message> = {
          recalled: true,
          recalledBy,
        }
        if (msg.type === 'txt' && 'msg' in msg) {
          patch.originalMsg = (msg as EasemobChat.TextMsgBody).msg
        }
        Object.assign(msg, patch)
        break
      }
    }
  }

  function deleteMessage(msgId: string) {
    for (const key in messageMap.value) {
      messageMap.value[key] = messageMap.value[key].filter((m: Message) => m.id !== msgId && m.mid !== msgId)
    }
  }

  /** 批量删除消息（支持多选删除） */
  function deleteMessages(msgIds: string[]) {
    const idSet = new Set(msgIds)
    for (const key in messageMap.value) {
      messageMap.value[key] = messageMap.value[key].filter(
        (m: Message) => !idSet.has(m.id) && !idSet.has(m.mid || '')
      )
    }
  }

  function clearMessages(conversationId: string) {
    delete messageMap.value[conversationId]
  }

  /** 读取合并消息解析缓存（未命中返回 undefined） */
  function getParsedCombineMessages(msgId: string): EasemobChat.ExcludeAckMessageBody[] | undefined {
    return parsedCombineMessageMap.value[msgId]
  }

  /** 写入合并消息解析缓存 */
  function setParsedCombineMessages(msgId: string, messages: EasemobChat.ExcludeAckMessageBody[]) {
    parsedCombineMessageMap.value[msgId] = messages
  }

  /** 清除某条合并消息的解析缓存 */
  function clearParsedCombineMessages(msgId: string) {
    delete parsedCombineMessageMap.value[msgId]
  }

  return {
    messageMap,
    sendingMessages,
    pinnedMessageMap,
    parsedCombineMessageMap,
    getMessages,
    getPinnedMessages,
    addMessage,
    prependMessages,
    updateMessageById,
    replaceMessageById,
    updateMessageStatus,
    recallMessage,
    deleteMessage,
    deleteMessages,
    clearMessages,
    applyModifiedMessage,
    setMessagePinned,
    setMessageUnpinned,
    setPinnedMessages,
    setTranslation,
    toggleTranslation,
    setTranslating,
    getParsedCombineMessages,
    setParsedCombineMessages,
    clearParsedCombineMessages,
  }
})
