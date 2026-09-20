import { CONVERSATION_TYPE, createLogger, normalizeUserId, resolveLastMessageText } from '@easemob/uikit-sdk-contract'
import type { ConversationTypeValue, UiMessage } from '@easemob/uikit-sdk-contract'
import { adapterPreviewLabels } from './adapter/conversation-adapter'
import { getEventHandlerDeps } from './event/deps'
import type { EventStores } from './event/types'

const notifyLog = createLogger('UIKit:Webim4Notification')

/**
 * 解析消息发送者的显示名称（对齐 websdk5 resolve-display-name）。
 * 优先级：联系人备注 > 联系人名称 > 用户资料昵称 > 消息 ext 快照昵称 > ext 快照备注 > userId。
 * （contact.name 一级为 webim4 本地约定，与会话摘要 resolveSenderName 保持一致）
 */
function resolveSenderDisplayName(stores: EventStores, message: UiMessage): string {
  const from = message.from || ''
  const contact = stores.contact.getContact(from)
  if (contact?.remark)
    return contact.remark
  if (contact?.name)
    return contact.name
  const userInfo = stores.userInfo.getUserInfo(from)
  if (userInfo?.nickname)
    return userInfo.nickname
  const extInfo = message.ext?.ease_chat_uikit_user_info as Record<string, string> | undefined
  if (extInfo?.nickname)
    return extInfo.nickname
  if (extInfo?.remark)
    return extInfo.remark
  return from
}

/**
 * 新消息通知判定引擎（对齐 websdk5 notification-engine 语义）。
 * 在 chat-events onMessage 中调用（消息落库/会话更新之后），
 * 入参为已转换好的中立 UiMessage，不触碰 4.x SDK 消息类型；
 * 不阻塞主流程（内部全部静默失败，仅 console.warn）。
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
export function notifyOnNewMessage(stores: EventStores, uiMsg: UiMessage) {
  try {
    const { useNotification, emitNotificationDelivered } = getEventHandlerDeps()
    const { state, notify, notifyBrowser } = useNotification()

    if (!state.value.enabled)
      return

    if (normalizeUserId(uiMsg.from) === normalizeUserId(stores.client.currentUser))
      return

    if (uiMsg.conversationId === stores.conversation.currentConversationId)
      return

    const cvs = stores.conversation.conversationList.find(c => c.id === uiMsg.conversationId)
    if (cvs?.isMuted)
      return

    const isHidden = typeof document === 'undefined' || document.visibilityState === 'hidden'
    if (state.value.triggerMode === 'background' && !isHidden)
      return

    const senderName = resolveSenderDisplayName(stores, uiMsg)
    const isGroup = uiMsg.conversationType === CONVERSATION_TYPE.GROUPCHAT
    const item = {
      // 群聊标题为群名（正文含 "发送者: 内容" 前缀），单聊标题为发送者名
      title: isGroup ? (cvs?.name || senderName) : senderName,
      body: resolveLastMessageText(uiMsg, undefined, senderName, undefined, adapterPreviewLabels),
      // 群聊用群头像，单聊用发送者头像
      avatar: isGroup ? cvs?.avatar : stores.userInfo.getUserInfo(uiMsg.from)?.avatarUrl,
      timestamp: uiMsg.timestamp || Date.now(),
      conversationId: uiMsg.conversationId,
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
      }).catch((err: unknown) => {
        notifyLog.warn('notifyBrowser failed:', err)
      })
    }
    else if (state.value.inAppEnabled) {
      notify(item)
      emitNotificationDelivered(item, 'in-app')
    }
  }
  catch (err) {
    // 通知失败不影响消息主流程
    notifyLog.warn('notifyOnNewMessage failed:', err)
  }
}

/** 联系人关系变更事件类型：'declined' 我发出的好友申请被对方拒绝 | 'deleted' 被好友删除 */
export type ContactEventKind = 'declined' | 'deleted'

/**
 * 联系人关系变更通知（好友申请被拒 / 被好友删除）。
 * 在 contact-events 的 onContactRefuse / onContactDeleted 中调用，不阻塞主流程。
 *
 * 与 notifyOnNewMessage 的差异：好友关系变更是低频高优事件，跳过免打扰 /
 * 当前会话 / triggerMode 判定（前台使用中也必须可见），仅尊重总开关；
 * 通道选择（隐藏→浏览器优先、失败降级页内 / 可见→页内弹窗）与送达回调语义保持一致。
 */
export function notifyContactEvent(stores: EventStores, userId: string, kind: ContactEventKind) {
  try {
    const { t, useNotification, emitNotificationDelivered, resolveNoticeUserName } = getEventHandlerDeps()
    const { state, notify, notifyBrowser } = useNotification()

    if (!state.value.enabled)
      return

    const userInfo = stores.userInfo.getUserInfo(userId)
    const item = {
      title: resolveNoticeUserName(userInfo) || userId,
      body: t(kind === 'declined' ? 'contact.inviteDeclinedByPeer' : 'chat.notice.contactDeleted'),
      avatar: userInfo?.avatarUrl,
      timestamp: Date.now(),
      conversationId: userId,
      conversationType: CONVERSATION_TYPE.SINGLECHAT,
    }

    const isHidden = typeof document === 'undefined' || document.visibilityState === 'hidden'
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
      }).catch((err: unknown) => {
        notifyLog.warn('notifyBrowser failed:', err)
      })
    }
    else if (state.value.inAppEnabled) {
      notify(item)
      emitNotificationDelivered(item, 'in-app')
    }
  }
  catch (err) {
    // 通知失败不影响联系人事件主流程
    notifyLog.warn('notifyContactEvent failed:', err)
  }
}
