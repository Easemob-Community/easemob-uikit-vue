import type { Message as SdkMessage } from 'easemob-websdk'
import type { ConversationTypeValue } from '@easemob/uikit-core'
import { CONVERSATION_TYPE } from '@easemob/uikit-core'
import { emitNotificationDelivered, useNotification } from '@easemob/uikit-core'
import { resolveLastMessageText, resolveSenderDisplayName } from '../utils/resolve-last-message-text'
import { normalizeUserId, toUiMessage } from './adapter/message-adapter'
import type { RootStores } from './event/types'

/**
 * 新消息通知判定引擎。
 * 在 chat-events onMessage 中调用，不阻塞主流程（内部全部静默失败，仅 console.warn）。
 *
 * 触发条件（全部满足才通知）：
 * 1. 总开关开启（useNotification 单例配置）
 * 2. 非自己发送的消息
 * 3. 非当前打开的会话（当前会话实时消息不打扰）
 * 4. 会话未开启免打扰（isMuted）
 * 5. 触发模式判定：'background'（默认）要求页面处于隐藏状态；'always' 不限可见性
 *
 * 通道选择：
 * - 页面隐藏：浏览器系统通知优先（自动请求权限），失败/被拒降级页内弹窗
 * - 页面可见（always 模式）：仅页内右上角弹窗
 */
export function notifyOnNewMessage(stores: RootStores, sdkMsg: SdkMessage) {
  const { state, notify, notifyBrowser } = useNotification()

  if (!state.value.enabled)
    return

  if (normalizeUserId(sdkMsg.from) === normalizeUserId(stores.client.currentUser))
    return

  if (sdkMsg.conversationId === stores.conversation.currentConversationId)
    return

  const cvs = stores.conversation.conversationList.find(c => c.id === sdkMsg.conversationId)
  if (cvs?.isMuted)
    return

  const isHidden = typeof document === 'undefined' || document.visibilityState === 'hidden'
  if (state.value.triggerMode === 'background' && !isHidden)
    return

  const uiMsg = toUiMessage(sdkMsg, stores.client.currentUser)
  const senderName = resolveSenderDisplayName(stores, uiMsg)
  const isGroup = uiMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT
  const item = {
    // 群聊标题为群名（正文含 "发送者: 内容" 前缀），单聊标题为发送者名
    title: isGroup ? (cvs?.name || senderName) : senderName,
    body: resolveLastMessageText(uiMsg, undefined, senderName),
    // 群聊用群头像，单聊用发送者头像
    avatar: isGroup ? cvs?.avatar : stores.userInfo.getUserInfo(sdkMsg.from)?.avatarUrl,
    timestamp: uiMsg.timestamp || Date.now(),
    conversationId: sdkMsg.conversationId,
    conversationType: uiMsg.conversationType as ConversationTypeValue,
  }

  if (isHidden && state.value.browserEnabled) {
    void notifyBrowser(item).then((sent) => {
      if (sent) {
        // 浏览器系统通知实际发出后触发送达回调（channel: 'browser'）
        emitNotificationDelivered(item, 'browser')
      }
      else if (state.value.inAppEnabled) {
        // 浏览器通知失败（权限被拒/不支持/异常）时降级为页内弹窗
        notify(item)
        emitNotificationDelivered(item, 'in-app')
      }
    })
  }
  else if (state.value.inAppEnabled) {
    notify(item)
    emitNotificationDelivered(item, 'in-app')
  }
}
