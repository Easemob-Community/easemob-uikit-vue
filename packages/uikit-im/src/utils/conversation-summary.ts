import type { UiMessage } from '@easemob-community/uikit-core'
import { MESSAGE_TYPE } from '@easemob-community/uikit-core'

/**
 * [zh-CN] 从当前会话消息中挑选用于会话列表摘要的最后一条消息。
 *
 * UIKit 本地系统通知（群成员进出、管理员变更、好友申请等）的 `timestamp`
 * 是 `Date.now()`，只应出现在聊天页，不能参与会话列表的摘要与排序；
 * 否则一次成员入群事件就会把对应会话顶到列表最前面。这里统一跳过
 * `MESSAGE_TYPE.NOTICE`，让摘要始终落在最后一条真实消息上。
 *
 * [en-US] Picks the message used for the conversation-list summary.
 *
 * UIKit-local notices use `Date.now()` as their timestamp and are only meant
 * for the chat message list. They must not affect the conversation summary or
 * ordering, otherwise a group-member-joined event can move the conversation to
 * the top of the list. NOTICE messages are skipped so the summary always comes
 * from the last real message.
 */
export function pickLastSummaryMessage(
  messages: readonly UiMessage[],
): UiMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message && message.type !== MESSAGE_TYPE.NOTICE)
      return message
  }
  return undefined
}
