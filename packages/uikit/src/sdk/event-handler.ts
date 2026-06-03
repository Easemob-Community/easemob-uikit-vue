import type { UIKitClient } from './client'
import { getClient } from './client'
import { useMessageStore } from '../store/message'
import { useClientStore } from '../store/client'
import { useConversationStore } from '../store/conversation'
import { useGroupStore } from '../store/group'
import { useContactStore } from '../store/contact'
import { usePresenceStore, type PresenceStatus } from '../store/presence'
import { MESSAGE_STATUS, CONVERSATION_TYPE } from '../constants'
import type { Message } from '../store/message'
import type { ConversationTypeValue } from '../constants'
import type {
  ConnectionEventHandlerMap,
  ChatEventHandlerMap,
  ContactEventHandlerMap,
  GroupEventHandlerMap,
  PresenceEventHandlerMap,
} from 'im-sdk-web'

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
 * 新 SDK Message 基础字段（WebSocket 层原始消息结构）
 */
interface SdkMsgBase {
  msgServerId?: string
  id?: string
  from?: string
  to?: string
  timestamp?: number
  time?: number
  conversationType?: 'singleChat' | 'groupChat'
  chatType?: string
  ext?: { [key: string]: unknown }
  /**
   * @see SDK_DEFICIENCY: MessageBody 联合类型未从 im-sdk-web 主入口导出，
   * 无法在编译期约束 body 的精确类型。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
  type?: string
}

/**
 * 从 SDK 消息中计算 conversationId
 * - 群聊：msg.to 即群 ID
 * - 单聊：取对方 ID（msg.from === 当前用户 ? msg.to : msg.from）
 */
function resolveConversationId(msg: SdkMsgBase, currentUser: string): string {
  const isGroup = msg.conversationType === 'groupChat' || msg.chatType === 'groupChat'
  return (isGroup ? msg.to : (msg.from === currentUser ? msg.to : msg.from)) || ''
}

/**
 * 从 SDK Message body 中提取 lastMessageText
 */
function getLastMessageText(sdkMsg: SdkMsgBase): string {
  switch (sdkMsg.type) {
    case 'text':
      return sdkMsg.body?.content || ''
    case 'image':
      return '[图片]'
    case 'voice':
      return '[语音]'
    case 'video':
      return '[视频]'
    case 'file':
      return '[文件]'
    case 'location':
      return '[位置]'
    case 'combine':
      return sdkMsg.body?.summary || '[聊天记录]'
    case 'cmd':
      return '[命令]'
    case 'custom':
      return '[自定义]'
    default:
      return ''
  }
}

/**
 * 将新 SDK Message 转换为 UI Message
 */
function convertSdkMessageToUiMessage(sdkMsg: SdkMsgBase, currentUser: string): Message {
  const isGroup = sdkMsg.conversationType === 'groupChat' || sdkMsg.chatType === 'groupChat'
  const chatType: ConversationTypeValue = isGroup ? CONVERSATION_TYPE.GROUPCHAT : CONVERSATION_TYPE.SINGLECHAT
  const conversationId = resolveConversationId(sdkMsg, currentUser)

  // 解析 allowGroupAck
  /**
   * @see SDK_DEFICIENCY: SDK Message 类型未暴露 msgConfig 字段，
   * 但 WebSocket 层实际下发该字段用于群已读回执标记。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgConfigAllowGroupAck = (sdkMsg as any).msgConfig?.allowGroupAck
  const extMsgConfigAllowGroupAck = sdkMsg.ext
    && typeof sdkMsg.ext === 'object'
    && sdkMsg.ext.msgConfig
    && typeof sdkMsg.ext.msgConfig === 'object'
    && (sdkMsg.ext.msgConfig as Record<string, unknown>).allowGroupAck
  const requireGroupAck = !!(msgConfigAllowGroupAck || extMsgConfigAllowGroupAck)

  const body = sdkMsg.body || {}

  const uiMsg: Message = {
    // 身份
    id: sdkMsg.id || sdkMsg.msgServerId || '',
    serverId: sdkMsg.msgServerId || sdkMsg.id || '',
    // 会话
    from: sdkMsg.from || '',
    to: sdkMsg.to || '',
    conversationType: chatType,
    // 时间
    timestamp: sdkMsg.timestamp || sdkMsg.time || Date.now(),
    // 类型
    type: (sdkMsg.type || 'text') as Message['type'],
    // 扩展
    ext: sdkMsg.ext,
    // 文本消息
    content: body.content,
    // 媒体消息
    url: body.url || body.originalImageUrl,
    thumbnailUrl: body.thumbnailUrl,
    secret: body.secret,
    filename: body.filename,
    fileSize: body.fileSize,
    duration: body.duration,
    width: body.width,
    height: body.height,
    // 位置消息
    latitude: body.latitude,
    longitude: body.longitude,
    address: body.address,
    // 自定义消息
    customEvent: body.customEvent,
    customExts: body.customExts,
    // 合并消息
    title: body.title,
    summary: body.summary,
    compatibleText: body.compatibleText,
    messageList: body.messageList,
    // 命令消息
    action: body.action,
    // UI 扩展
    conversationId,
    isSelf: false,
    status: MESSAGE_STATUS.SENT,
    requireGroupAck: requireGroupAck || undefined,
  }

  return uiMsg
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
   */
  function handleIncomingMessage(sdkMsg: SdkMsgBase) {
    const currentUser = stores.client.currentUser
    const isGroup = sdkMsg.conversationType === 'groupChat' || sdkMsg.chatType === 'groupChat'
    const conversationId = resolveConversationId(sdkMsg, currentUser)
    const lastMessageText = getLastMessageText(sdkMsg)

    const uiMsg = convertSdkMessageToUiMessage(sdkMsg, currentUser)

    stores.message.addMessage(uiMsg)

    // 更新会话列表
    stores.conversation.addConversation({
      id: conversationId,
      name: isGroup ? (sdkMsg.to || '') : (sdkMsg.from || ''),
      lastMessage: lastMessageText,
      lastMessageTime: sdkMsg.timestamp || sdkMsg.time || Date.now(),
      lastMessageType: (sdkMsg.type || 'text') as ConversationTypeValue,
      lastMessageSender: sdkMsg.from || '',
      type: uiMsg.conversationType,
    })

    // 检测是否@我（仅群聊场景，且非自己发送的消息）
    if (isGroup && sdkMsg.from !== currentUser && isAtMe(sdkMsg, currentUser)) {
      stores.conversation.setAtMe(conversationId, true)
      stores.message.addAtMeMessage(conversationId, uiMsg.id)
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
      const clientInstance = getClient()
      if (clientInstance) {
        // 单聊：自动发消息已读回执
        if (!isGroup && uiMsg.serverId) {
          clientInstance.sendMessageReadAck({
            conversationId,
            conversationType: uiMsg.conversationType,
            messageId: uiMsg.serverId,
          }).catch((e: unknown) => console.warn('[EventHandler] sendMessageReadAck failed:', e))
        }
        // 群已读回执：若消息携带 allowGroupAck，自动回复
        if (uiMsg.requireGroupAck && isGroup) {
          clientInstance.sendGroupMessageReadAck({
            groupId: sdkMsg.to || conversationId,
            messageId: uiMsg.serverId,
          }).catch((e: unknown) => console.warn('[EventHandler] sendGroupMessageReadAck failed:', e))
        }
      }
    }
  }

  // ========== 连接事件处理器 ==========
  const connHandler = {
    onConnected: () => {
      stores.client.setConnected(true)
    },
    onDisconnected: () => {
      stores.client.setConnected(false)
      stores.client.setCurrentUser('')
    },
    onTokenWillExpire: () => {
      console.warn('[UIKit] Token will expire')
    },
    onTokenExpired: () => {
      console.error('[UIKit] Token expired')
    },
  }

  // ========== Chat 事件处理器 ==========
  const chatHandler = {
    /** 统一消息接收 */
    onMessage: (messages: SdkMsgBase[]) => {
      if (!Array.isArray(messages)) {
        handleIncomingMessage(messages)
        return
      }
      for (const msg of messages) {
        handleIncomingMessage(msg)
      }
    },

    /** 消息撤回 */
    onMessageRecalled: (payload: { messageId: string; from?: string }) => {
      if (payload.messageId) {
        stores.message.recallMessage(payload.messageId, payload.from || '')
      }
    },

    /** 送达回执 */
    onMessageDelivered: (payload: { messageId: string }) => {
      if (payload.messageId) {
        stores.message.updateMessageStatus(payload.messageId, MESSAGE_STATUS.DELIVERED)
      }
    },

    /** 消息已读回执 */
    onMessageRead: (payload: { messageId: string; groupReadCount?: number }) => {
      if (!payload.messageId) return

      // 群已读回执
      if (payload.groupReadCount !== undefined) {
        stores.message.updateMessageById(payload.messageId, { groupReadCount: payload.groupReadCount })
        return
      }

      // 单聊已读回执
      stores.message.updateMessageStatus(payload.messageId, MESSAGE_STATUS.READ)
    },

    /** 会话已读回执 */
    onConversationRead: (payload: { conversationId: string }) => {
      if (payload.conversationId) {
        stores.conversation.updateUnreadCount(payload.conversationId, 0)
      }
    },

    /** 消息被编辑 */
    onMessageUpdated: (payload: { messageId: string; message: SdkMsgBase }) => {
      const currentUser = stores.client.currentUser
      const uiMsg = convertSdkMessageToUiMessage(payload.message, currentUser)
      stores.message.applyModifiedMessage(uiMsg)
    },

    /** 消息置顶/取消置顶事件 */
    onPinnedMessageChanged: (payload: { messageId: string; operation: 'pin' | 'unpin'; operatorId?: string; time?: number }) => {
      if (!payload || !payload.messageId) return
      if (payload.operation === 'pin') {
        stores.message.setMessagePinned(payload.messageId, {
          operatorId: payload.operatorId || '',
          pinTime: payload.time || Date.now(),
        })
      } else if (payload.operation === 'unpin') {
        stores.message.setMessageUnpinned(payload.messageId)
      }
    },

    /** 会话列表同步开始 */
    onConversationListSyncDidStart: () => {
      // 可选：设置同步状态
    },

    /** 会话列表同步完成 */
    onConversationListSyncDidFinish: () => {
      // 可选：清除同步状态
    },

    /** 会话实时更新 */
    onConversationUpdate: (payload: SdkMsgBase & { conversationId?: string; unreadCount?: number }) => {
      if (payload.conversationId) {
        const currentUser = stores.client.currentUser
        const lastMessageText = getLastMessageText(payload)
        stores.conversation.addConversation({
          id: payload.conversationId,
          name: payload.from || '',
          lastMessage: lastMessageText,
          lastMessageTime: payload.timestamp || Date.now(),
          lastMessageType: (payload.type || 'text') as ConversationTypeValue,
          lastMessageSender: payload.from || '',
          type: (payload.conversationType || 'singleChat') as ConversationTypeValue,
          unreadCount: payload.unreadCount,
        })
      }
    },
  }

  // ========== 好友事件（可选） ==========
  if (options.enableContact) {
    const contactHandler = {
      onContactInvited: (msg: { from?: string; to?: string; status?: string }) => {
        console.info('[UIKit] onContactInvited:', msg)
      },
      onContactAgreed: (msg: { from?: string }) => {
        const userId = msg.from
        if (!userId) return
        stores.contact.addContact({ userId, name: userId })
      },
      onContactRefuse: (msg: { from?: string }) => {
        console.info('[UIKit] onContactRefuse:', msg)
      },
      onContactDeleted: (msg: { from?: string }) => {
        const userId = msg.from
        if (userId) stores.contact.removeContact(userId)
      },
      onContactAdded: (msg: { from?: string }) => {
        const userId = msg.from
        if (!userId) return
        stores.contact.addContact({ userId, name: userId })
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.addContactEventHandler('uikit-contact', contactHandler as any)
  }

  // ========== 黑名单事件（可选） ==========
  if (options.enableBlocklist) {
    // 新 SDK 黑名单事件通过 contactManager 事件处理
    const blockHandler = {
      onContactInfoUpdated: (msg: { userId?: string; remark?: string }) => {
        console.info('[UIKit] onContactInfoUpdated:', msg)
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.addContactEventHandler('uikit-blocklist', blockHandler as any)
  }

  // ========== 在线状态事件（可选） ==========
  if (options.enablePresence) {
    const presenceHandler = {
      onPresenceStatusChange: (list: { userId?: string; ext?: string; statusDetails?: { status?: number | string }[] }[]) => {
        if (!Array.isArray(list)) return
        const mapped = list.map((item) => {
          const userId = item.userId || ''
          const details = Array.isArray(item.statusDetails) ? item.statusDetails : []
          const isOnline = details.some((d) => Number(d?.status) === 1)
          const ext = item.ext || ''
          let status: PresenceStatus = isOnline ? 'online' : 'offline'
          if (ext) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.addEventHandler('uikit-presence', presenceHandler as any)
  }

  // ========== 群组事件（可选） ==========
  if (options.enableGroup) {
    /**
     * @see SDK_DEFICIENCY: 群组事件 payload 中多数字段类型为 UserInfo，
     * UIKit 当前仅处理 userId 字符串，存在类型不完全匹配。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupHandler: GroupEventHandlerMap = {
      onGroupInfoChanged: (payload: any) => {
        stores.group.updateGroup(payload.groupId, {
          groupName: payload.groupName,
          description: payload.description,
          avatar: payload.avatar,
        })
      },
      onMembersJoined: (payload: any) => {
        stores.group.incrementMemberCount(payload.groupId, payload.members.length)
      },
      onMembersExited: (payload: any) => {
        stores.group.decrementMemberCount(payload.groupId, payload.members.length)
      },
      onOwnerChanged: (payload: any) => {
        stores.group.updateGroup(payload.groupId, { owner: payload.newOwner })
      },
      onAdminAdded: (payload: any) => {
        stores.group.markAdmin(payload.groupId, payload.admin)
      },
      onAdminRemoved: (payload: any) => {
        stores.group.unmarkAdmin(payload.groupId, payload.admin)
      },
      onUserRemoved: (payload: any) => {
        const currentUser = stores.client.currentUser
        if (payload.userId === currentUser) {
          stores.group.removeGroup(payload.groupId)
        }
      },
      onGroupDestroyed: (payload: any) => {
        stores.group.removeGroup(payload.groupId)
      },
      onAnnouncementChanged: (payload: any) => {
        stores.group.updateGroup(payload.groupId, { announcement: payload.announcement })
      },
      onMuteListAdded: (payload: any) => {
        stores.group.setMuted(payload.groupId, payload.members, true)
      },
      onMuteListRemoved: (payload: any) => {
        stores.group.setMuted(payload.groupId, payload.members, false)
      },
      onAllMemberMuteStateChanged: (payload: any) => {
        stores.group.updateGroup(payload.groupId, { mute: payload.allMuted })
      },
    }
    client.addGroupEventHandler('uikit-group', groupHandler)
  }

  // 注册事件处理器
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.addEventHandler('uikit-conn', connHandler as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.addChatEventHandler('uikit-chat', chatHandler as any)

  return {
    dispose: () => {
      client.removeEventHandler('uikit-conn')
      client.removeChatEventHandler('uikit-chat')
      if (options.enableContact) {
        client.removeContactEventHandler('uikit-contact')
      }
      if (options.enableBlocklist) {
        client.removeContactEventHandler('uikit-blocklist')
      }
      if (options.enablePresence) {
        client.removeEventHandler('uikit-presence')
      }
      if (options.enableGroup) {
        client.removeGroupEventHandler('uikit-group')
      }
    },
  }
}

