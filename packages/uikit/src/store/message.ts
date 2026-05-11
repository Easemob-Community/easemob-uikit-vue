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

  function getMessages(conversationId: string): Message[] {
    return messageMap.value[conversationId] || []
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
      messageMap.value[key] = messageMap.value[key].filter((m: Message) => m.id !== msgId)
    }
  }

  function clearMessages(conversationId: string) {
    delete messageMap.value[conversationId]
  }

  return {
    messageMap,
    sendingMessages,
    getMessages,
    addMessage,
    prependMessages,
    updateMessageById,
    replaceMessageById,
    updateMessageStatus,
    recallMessage,
    deleteMessage,
    clearMessages,
  }
})
