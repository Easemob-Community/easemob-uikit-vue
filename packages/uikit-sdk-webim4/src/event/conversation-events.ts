import type { EasemobChat } from 'easemob-websdk-4'
import type { SdkPersistenceHooks } from '@easemob/uikit-sdk-contract'
import { createLogger } from '@easemob/uikit-sdk-contract'
import { firePersistenceHook } from '../persistence'
import type { EventStores } from './types'

const conversationLog = createLogger('UIKit:Webim4ConversationEvents')

/**
 * 创建 4.x 会话相关事件处理器（store 语义对齐 websdk5 onMultiDeviceConversation）。
 * 4.x 所有事件挂单一 `connection.addEventHandler`，返回 Partial 由 registry 合并注册。
 *
 * 4.24.2 事实（以类型与源码为准）：
 * - **无 onConversationListUpdate 等价事件**：会话列表变化由 domain 的
 *   refresh/loadMore 主动 setList（见 conversation-domain.ts）；
 * - 本端操作（置顶/删除/标记/免打扰）由 domain 成功后本地回写；
 * - **其他设备**的会话变更经 `onMultiDeviceEvent` 下发，operation 全集：
 *   `pinnedConversation` / `unpinnedConversation` / `deleteConversation` /
 *   `markConversation` / `unMarkConversation`（ConversationChangedInfo），
 *   `setSilentModeForConversation` / `removeSilentModeForConversation`（NotificationConMultiDeviceInfo），
 *   `deleteRoaming`（漫游消息删除，消息链路职责：4.x 仅到会话粒度、不带 messageIds，
 *   对齐 websdk5 onMultiDeviceMessageRemoved 的近似语义——清空该会话本地消息并落删除墓碑）。
 *   其余 operation（chatThread 系列 / memberAttributesUpdate / setSilentModeForUser）
 *   分属 thread/group/全局免打扰域，不在本文件处理。
 */
export function createConversationHandlers(
  stores: EventStores,
  persistence?: SdkPersistenceHooks,
): Partial<EasemobChat.EventHandlerType> {
  return {
    onMultiDeviceEvent: (event) => {
      switch (event.operation) {
        case 'pinnedConversation':
          conversationLog.info('onMultiDeviceEvent pinnedConversation', { conversationId: event.conversationId })
          stores.conversation.updateConversation(event.conversationId, {
            isPinned: true,
            pinnedTime: event.timestamp || Date.now(),
          })
          break
        case 'unpinnedConversation':
          conversationLog.info('onMultiDeviceEvent unpinnedConversation', { conversationId: event.conversationId })
          stores.conversation.updateConversation(event.conversationId, {
            isPinned: false,
            pinnedTime: 0,
          })
          break
        case 'deleteConversation':
          conversationLog.info('onMultiDeviceEvent deleteConversation', { conversationId: event.conversationId })
          stores.conversation.deleteConversation(event.conversationId)
          break
        case 'markConversation':
        case 'unMarkConversation': {
          // conversationMark 为 4.x MarkType 数字枚举（mark_0~mark_19 → 0~19）
          const mark = event.conversationMark !== undefined ? Number(event.conversationMark) : undefined
          conversationLog.info(`onMultiDeviceEvent ${event.operation}`, { conversationId: event.conversationId, mark })
          if (mark === undefined)
            break
          const existing = stores.conversation.conversationList.find(c => c.id === event.conversationId)
          if (!existing)
            break
          const marks = event.operation === 'markConversation'
            ? (existing.marks.includes(mark) ? existing.marks : [...existing.marks, mark])
            : existing.marks.filter(m => m !== mark)
          stores.conversation.updateConversation(event.conversationId, { marks })
          break
        }
        case 'setSilentModeForConversation': {
          // 与 ThreadMultiDeviceInfo 共用 operation 字面量，靠 data 字段判别（会话免打扰事件带 data）
          if (!('data' in event))
            break
          const remindType = event.data?.type
          const ignoreDuration = event.data?.ignoreDuration
          // remindType=NONE 或未过期的时长型免打扰（ignoreDuration 为 Unix 时间戳）视为免打扰中
          const isMuted = remindType === 'NONE'
            || (typeof ignoreDuration === 'number' && ignoreDuration > Date.now())
          conversationLog.info('onMultiDeviceEvent setSilentModeForConversation', { conversationId: event.conversationId, remindType })
          stores.conversation.updateConversation(event.conversationId, {
            isMuted,
            remindType: remindType ?? (isMuted ? 'NONE' : 'ALL'),
          })
          break
        }
        case 'removeSilentModeForConversation': {
          if (!('data' in event))
            break
          conversationLog.info('onMultiDeviceEvent removeSilentModeForConversation', { conversationId: event.conversationId })
          stores.conversation.updateConversation(event.conversationId, {
            isMuted: false,
            remindType: 'ALL',
          })
          break
        }
        case 'deleteRoaming': {
          // 漫游消息多设备删除（消息链路职责）：4.x 事件仅到会话粒度
          // （RoamingDeleteMultiDeviceInfo 不带 messageIds/beforeTimestamp），
          // 对齐 websdk5 onMultiDeviceMessageRemoved 的近似语义——
          // 该会话本地已加载消息全部删除，并旁路落删除墓碑。
          const msgs = stores.message.getMessages(event.conversationId)
          const ids = msgs
            .map(m => m.msgServerId || m.msgLocalId)
            .filter((id): id is string => !!id)
          conversationLog.info('onMultiDeviceEvent deleteRoaming', { conversationId: event.conversationId, count: ids.length })
          if (ids.length === 0)
            break
          stores.message.deleteMessages(ids)
          // 旁路持久化：删除墓碑（deleted + tombstoneTime 由实现方置位）
          firePersistenceHook(conversationLog, 'deleteMessages', persistence?.message?.deleteMessages, ids)
          break
        }
        default:
          // chatThread* / memberAttributesUpdate / setSilentModeForUser 不在此处理
          break
      }
    },
  }
}
