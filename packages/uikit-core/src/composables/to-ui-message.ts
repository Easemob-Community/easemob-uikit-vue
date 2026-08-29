import { markRaw } from 'vue'
import { MESSAGE_STATUS, isCombineBody, normalizeUserId } from '@easemob/uikit-sdk-contract'
import type { CombineMessageBody, SdkMessage, UiMessage } from '@easemob/uikit-sdk-contract'
import { createLogger } from '../utils/logger'

const logger = createLogger('UIKit:ToUiMessage')

/**
 * 将中立 SdkMessage 转换为 UIKit Message。
 * - 保留 SdkMessage 全部字段作为真相源
 * - 仅添加 UI 层需要的计算/状态字段（isSelf / localId / status）
 * - 合并消息的 messageList 仅用于创建/转发，UI 渲染不需要，
 *   标记为 raw 避免进入 Vue 响应式系统产生性能问题。
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
  return uiMsg
}

/** 批量转换 SdkMessage */
export function toUiMessages(sdkMsgs: readonly SdkMessage[], currentUserId: string): UiMessage[] {
  return sdkMsgs.map(msg => toUiMessage(msg, currentUserId))
}
