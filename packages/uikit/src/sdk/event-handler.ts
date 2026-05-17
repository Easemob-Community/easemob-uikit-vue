import type { UIKitClient } from './client'
import { getClient } from './client'
import type { EasemobChat } from 'easemob-websdk'
import { useMessageStore } from '../store/message'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'
import { useGroupStore } from '../store/group'
import { useContactStore } from '../store/contact'
import { usePresenceStore, type PresenceStatus } from '../store/presence'
import { MESSAGE_STATUS, CONVERSATION_TYPE } from '../constants'
import type { Message } from '../store/message'
import type { ConversationTypeValue } from '../constants'

export interface RootStores {
  message: ReturnType<typeof useMessageStore>
  client: ReturnType<typeof useClientStore>
  conversation: ReturnType<typeof useConversationStore>
  group: ReturnType<typeof useGroupStore>
  contact: ReturnType<typeof useContactStore>
  presence: ReturnType<typeof usePresenceStore>
}

/** 事件处理器可选业务开关，按需挂载对应类别事件 */
export interface EventHandlerOptions {
  /** 是否启用好友事件（邀请/同意/拒绝/删除等） */
  enableContact?: boolean
  /** 是否启用黑名单事件 */
  enableBlocklist?: boolean
  /** 是否启用在线状态事件 */
  enablePresence?: boolean
  /** 是否启用群组体系 */
  enableGroup?: boolean
}

/**
 * SDK 内容消息共有的基础字段（用于 resolveConversationId）
 * 等价于 ExcludeAckMessageBody 各变体的公共字段
 */
interface SdkMsgBase {
  id: string
  from?: string
  to?: string
  time?: number
  chatType?: EasemobChat.ChatType
  ext?: { [key: string]: any }
}

/**
 * 从 SDK 消息中计算 conversationId
 * - 群聊：msg.to 即群 ID
 * - 单聊：取对方 ID（msg.from === 当前用户 ? msg.to : msg.from）
 */
function resolveConversationId(msg: SdkMsgBase, currentUser: string): string {
  const isGroup = msg.chatType === 'groupChat'
  return (isGroup ? msg.to : (msg.from === currentUser ? msg.to : msg.from)) || ''
}

export function createEventHandler(client: UIKitClient, stores: RootStores, options: EventHandlerOptions = {}) {
  /**
   * 检测消息是否@了当前用户
   * - 检查 ext.em_at_list 是否包含当前用户ID
   */
  function isAtMe(msg: SdkMsgBase, currentUser: string): boolean {
    const atList = msg.ext?.em_at_list
    if (Array.isArray(atList)) {
      return atList.includes(currentUser)
    }
    return false
  }

  /**
   * 公共处理逻辑：将 SDK 消息写入 messageStore 并更新会话列表
   * 直接展开 SDK 消息的所有原生字段 + 追加 UI 扩展字段，不做 body 映射
   */
  function handleIncomingMessage(
    msg: EasemobChat.ExcludeAckMessageBody,
    lastMessageText: string,
  ) {
    const currentUser = stores.client.currentUser
    const isGroup = msg.chatType === 'groupChat'
    const chatType: ConversationTypeValue = isGroup ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT
    const conversationId = resolveConversationId(msg, currentUser)

    // 解析 allowGroupAck：优先取 msgConfig，其次取 ext.msgConfig
    const msgConfigAllowGroupAck = (msg as EasemobChat.ExcludeAckMessageBody & { msgConfig?: { allowGroupAck?: boolean } }).msgConfig?.allowGroupAck
    const extMsgConfigAllowGroupAck = msg.ext
      && typeof msg.ext === 'object'
      && msg.ext.msgConfig
      && typeof msg.ext.msgConfig === 'object'
      && (msg.ext.msgConfig as Record<string, unknown>).allowGroupAck
    const requireGroupAck = !!(msgConfigAllowGroupAck || extMsgConfigAllowGroupAck)

    // 直接展开 SDK 原生字段，追加 UI 扩展字段
    const uiMsg: Message = {
      ...msg,
      conversationId,
      isSelf: false,
      status: MESSAGE_STATUS.SENT,
      timestamp: msg.time || Date.now(),
      requireGroupAck: requireGroupAck || undefined,
    } as Message

    stores.message.addMessage(uiMsg)

    // 更新会话列表
    stores.conversation.addConversation({
      id: conversationId,
      name: isGroup ? (msg.to || '') : (msg.from || ''),
      lastMessage: lastMessageText,
      lastMessageTime: msg.time || Date.now(),
      lastMessageType: msg.type as ConversationTypeValue,
      lastMessageSender: msg.from || '',
      type: chatType,
    })

    // 检测是否@我（仅群聊场景，且非自己发送的消息）
    if (isGroup && msg.from !== currentUser && isAtMe(msg, currentUser)) {
      stores.conversation.setAtMe(conversationId, true)
      stores.message.addAtMeMessage(conversationId, msg.id)
    }

    // 非当前会话的消息增加未读数
    const currentCvsId = stores.conversation.currentConversation?.id
    if (conversationId !== currentCvsId) {
      const cvs = stores.conversation.conversationList.find((c) => c.id === conversationId)
      if (cvs) {
        stores.conversation.updateUnreadCount(conversationId, (cvs.unreadCount || 0) + 1)
      }
    } else {
      // 当前会话的消息：自动发送已读回执
      const client = getClient()
      if (client) {
        // 单聊：自动发消息已读回执
        if (!isGroup) {
          client.sendReadAck({ chatType, to: conversationId, msgId: msg.id })
            .catch((e: unknown) => console.warn('[EventHandler] sendReadAck failed:', e))
        }
        // 群已读回执：若消息携带 allowGroupAck，自动回复
        if (requireGroupAck && isGroup) {
          client.sendGroupReadAck({
            to: msg.to || conversationId,
            msgId: msg.id,
          }).catch((e: unknown) => console.warn('[EventHandler] sendGroupReadAck failed:', e))
        }
      }
    }
  }

  const handler: EasemobChat.EventHandlerType & { onCombineMessage?: (msg: EasemobChat.CombineMsgBody) => void } = {
    onTextMessage: (msg: EasemobChat.TextMsgBody) => {
      handleIncomingMessage(msg, msg.msg || '')
    },

    onImageMessage: (msg: EasemobChat.ImgMsgBody) => {
      handleIncomingMessage(msg, '[图片]')
    },

    onAudioMessage: (msg: EasemobChat.AudioMsgBody) => {
      handleIncomingMessage(msg, '[语音]')
    },

    onVideoMessage: (msg: EasemobChat.VideoMsgBody) => {
      handleIncomingMessage(msg, '[视频]')
    },

    onFileMessage: (msg: EasemobChat.FileMsgBody) => {
      handleIncomingMessage(msg, '[文件]')
    },

    onCombineMessage: (msg: EasemobChat.CombineMsgBody) => {
      handleIncomingMessage(msg, msg.summary || '[聊天记录]')
    },

    /** 消息撤回：更新本地消息为撤回状态 */
    onRecallMessage: (msg: EasemobChat.RecallMsgBody) => {
      const msgId = msg.mid || msg.id
      if (msgId) {
        stores.message.recallMessage(msgId, msg.from || '')
      }
    },

    /** 送达回执：对方已收到消息，更新本地消息状态为 delivered */
    onDeliveredMessage: (msg: EasemobChat.DeliveryMsgBody) => {
      const msgId = msg.ackId || msg.mid || msg.id
      if (msgId) {
        stores.message.updateMessageStatus(msgId, MESSAGE_STATUS.DELIVERED)
      }
    },

    /** 会话已读回执：对方已读，将本地对应会话未读数置为 0 */
    onChannelMessage: (msg: EasemobChat.ChannelMsgBody) => {
      const conversationId = msg.from || msg.to
      if (conversationId) {
        stores.conversation.updateUnreadCount(conversationId, 0)
      }
    },

    /** 消息已读回执：单聊更新消息状态为 READ，群聊更新 groupReadCount */
    onReadMessage: (msg: EasemobChat.ReadMsgBody) => {
      const msgId = msg.mid || msg.ackId || msg.id
      if (!msgId) return

      // 群已读回执：更新 groupReadCount
      if (msg.groupReadCount && msg.mid) {
        const readCount = msg.groupReadCount[msg.mid]
        if (readCount !== undefined) {
          stores.message.updateMessageById(msgId, { groupReadCount: readCount })
        }
        return
      }

      // 单聊已读回执：更新消息状态为 READ
      stores.message.updateMessageStatus(msgId, MESSAGE_STATUS.READ)
    },

    /** 离线群已读回执：登录后批量接收 */
    onStatisticMessage: (msg: EasemobChat.CmdMsgBody) => {
      try {
        const location = (msg as EasemobChat.CmdMsgBody & { location?: string }).location
        if (!location) return
        const statisticMsg = JSON.parse(location)
        const groupAck: Array<{ msgId: string; readCount: number }> = statisticMsg?.group_ack || []
        for (const ack of groupAck) {
          if (ack.msgId) {
            stores.message.updateMessageById(ack.msgId, {
              groupReadCount: ack.readCount,
            })
          }
        }
      } catch (e) {
        console.warn('[EventHandler] onStatisticMessage parse failed:', e)
      }
    },

    /** 消息被编辑：用 SDK 返回的最新消息体覆盖本地，标记 modified */
    onModifiedMessage: (msg: EasemobChat.ModifiedEventMessage) => {
      const info = (msg as EasemobChat.ExcludeAckMessageBody & { modifiedInfo?: EasemobChat.ModifiedMsgInfo }).modifiedInfo
      stores.message.applyModifiedMessage(msg, info && {
        operatorId: info.operatorId,
        operationCount: info.operationCount,
        operationTime: info.operationTime,
      })
    },

    /** 消息置顶/取消置顶事件：多端同步 */
    onMessagePinEvent: (event: EasemobChat.MessagePinEvent) => {
      if (!event || !event.messageId) return
      if (event.operation === 'pin') {
        stores.message.setMessagePinned(event.messageId, {
          operatorId: event.operatorId || '',
          pinTime: event.time || Date.now(),
        })
      } else if (event.operation === 'unpin') {
        stores.message.setMessageUnpinned(event.messageId)
      }
    },

    /** 命令消息：处理输入状态提示 */
    onCmdMessage: (msg: EasemobChat.CmdMsgBody) => {
      const action = msg.action
      if (action === 'TypingBegin') {
        const conversationId = msg.from || ''
        if (conversationId) {
          stores.conversation.setTyping(conversationId, true)
        }
      }
    },

    /** 多设备事件同步：置顶/取消置顶/删除会话 */
    onMultiDeviceEvent: (event: EasemobChat.MultiDeviceEvent) => {
      if ('operation' in event && 'conversationId' in event) {
        const info = event as EasemobChat.ConversationChangedInfo
        if (info.operation === 'pinnedConversation') {
          stores.conversation.togglePin(info.conversationId, true, info.timestamp)
        } else if (info.operation === 'unpinnedConversation') {
          stores.conversation.togglePin(info.conversationId, false)
        } else if (info.operation === 'deleteConversation') {
          stores.conversation.deleteConversation(info.conversationId)
        }
      }
    },

    onConnected: () => {
      stores.client.setConnected(true)
    },
    onDisconnected: () => {
      stores.client.setConnected(false)
      stores.client.setCurrentUser('')
    },
    onError: (error) => {
      console.error('[UIKit SDK Error]', error)
    },
  }

  // ========== 好友事件（可选） ==========
  if (options.enableContact) {
    const contactHandler: Pick<
      EasemobChat.EventHandlerType,
      'onContactInvited' | 'onContactAgreed' | 'onContactRefuse' | 'onContactDeleted' | 'onContactAdded'
    > = {
      onContactInvited: (msg: EasemobChat.ContactMsgBody) => {
        // 接收到好友邀请——业务层可通过自定义 hook 接管，默认不介入 store
        console.info('[UIKit] onContactInvited:', msg)
      },
      onContactAgreed: (msg: EasemobChat.ContactMsgBody) => {
        const userId = msg.from
        if (!userId) return
        stores.contact.addContact({ userId, name: userId })
      },
      onContactRefuse: (msg: EasemobChat.ContactMsgBody) => {
        console.info('[UIKit] onContactRefuse:', msg)
      },
      onContactDeleted: (msg: EasemobChat.ContactMsgBody) => {
        const userId = msg.from
        if (userId) stores.contact.removeContact(userId)
      },
      onContactAdded: (msg: EasemobChat.ContactMsgBody) => {
        const userId = msg.from
        if (!userId) return
        stores.contact.addContact({ userId, name: userId })
      },
    }
    Object.assign(handler, contactHandler)
  }

  // ========== 黑名单事件（可选） ==========
  // 注：SDK 4.21.0 的 EventHandlerType 未公开 onBlockMsg，但运行时确实会回调，
  // 这里基于 SDK 实际下发结构定义最小局部类型，避免使用 any。
  if (options.enableBlocklist) {
    interface BlockMsgBody {
      action: 'addUserToBlackList' | 'removeUserFromBlackList'
      from?: string
      to?: string
      type?: string
    }
    const blockHandler: { onBlockMsg: (msg: BlockMsgBody) => void } = {
      onBlockMsg: (msg: BlockMsgBody) => {
        // SDK 黑名单事件路由在 onBlockMsg 中，action 区分 add/remove
        const userId = msg.from
        if (!userId) return
        if (msg.action === 'addUserToBlackList') {
          stores.contact.addToBlackList({ userId, name: userId })
        } else if (msg.action === 'removeUserFromBlackList') {
          stores.contact.removeFromBlackList(userId)
        }
      },
    }
    Object.assign(handler, blockHandler)
  }

  // ========== 在线状态事件（可选） ==========
  if (options.enablePresence) {
    const presenceHandler: Pick<EasemobChat.EventHandlerType, 'onPresenceStatusChange'> = {
      onPresenceStatusChange: (list: EasemobChat.PresenceType[]) => {
        if (!Array.isArray(list)) return
        const mapped = list.map((item) => {
          // SDK 返回结构：PresenceType { userId, ext, statusDetails: StatusDetailsType[{ device, status }] }
          // statusDetails 中任一设备 status === 1 即视为在线（SDK 类型为 number，运行时也可能为字符串 '1'）
          const userId = item.userId || ''
          const details: EasemobChat.StatusDetailsType[] = Array.isArray(item.statusDetails) ? item.statusDetails : []
          const isOnline = details.some((d) => Number(d?.status) === 1)
          const ext = item.ext || ''
          let status: PresenceStatus = isOnline ? 'online' : 'offline'
          if (ext) {
            // 存在自定义描述时，优先识别为常见状态字面量
            const lower = ext.toLowerCase()
            if (lower.includes('away')) status = 'away'
            else if (lower.includes('busy')) status = 'busy'
            else if (isOnline) status = 'custom'
          }
          return { userId, status, ext, lastTime: Date.now() }
        }).filter((p) => !!p.userId)
        stores.presence.updateBatch(mapped)
      },
    }
    Object.assign(handler, presenceHandler)
  }

  client.addEventHandler('uikit', handler)

  return {
    dispose: () => client.removeEventHandler('uikit'),
  }
}
