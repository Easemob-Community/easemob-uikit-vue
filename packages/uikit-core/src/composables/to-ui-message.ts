import { markRaw } from 'vue'
import { MESSAGE_STATUS, isCombineBody, isMultiBody, normalizeUserId } from '@easemob-community/uikit-sdk-contract'
import type { CombineMessageBody, SdkMessage, UiMessage } from '@easemob-community/uikit-sdk-contract'
import { createLogger } from '../utils/logger'

const logger = createLogger('UIKit:ToUiMessage')

/**
 * 将中立 SdkMessage 转换为 UIKit Message。
 * - 保留 SdkMessage 全部字段作为真相源
 * - 仅添加 UI 层需要的计算/状态字段（isSelf / localId / status）
 * - 合并消息子列表与复合消息分段仅用于数据展示，标记 raw 避免无用的深响应式包装
 */
export function toUiMessage(sdkMsg: SdkMessage, currentUserId: string): UiMessage {
  if (!currentUserId) {
    logger.warn('[toUiMessage] currentUserId is empty, isSelf may be inaccurate', {
      from: sdkMsg.from,
      conversationId: sdkMsg.conversationId,
      type: sdkMsg.type,
    })
  }
  const isSelf = normalizeUserId(sdkMsg.from) === normalizeUserId(currentUserId)
  const uiMsg: UiMessage = {
    ...sdkMsg,
    isSelf,
    localId: sdkMsg.msgLocalId,
    status: isSelf && sdkMsg.isPeerRead === true
      ? MESSAGE_STATUS.READ
      : (sdkMsg.sendStatus ?? MESSAGE_STATUS.SENT),
  }
  if (isCombineBody(uiMsg.body) && uiMsg.body.messageList) {
    uiMsg.body = {
      ...uiMsg.body,
      messageList: markRaw([...uiMsg.body.messageList]),
    } as CombineMessageBody
  }
  else if (isMultiBody(uiMsg.body)) {
    uiMsg.body = markRaw([...uiMsg.body])
  }
  return uiMsg
}

export function toUiMessages(sdkMsgs: readonly SdkMessage[], currentUserId: string): UiMessage[] {
  return sdkMsgs.map(msg => toUiMessage(msg, currentUserId))
}
