import { CONVERSATION_TYPE } from '@easemob-community/uikit-core'
import type { UiConversation } from '@easemob-community/uikit-core'

export function shouldFetchLastMessageSender(
  conversation: Pick<UiConversation, 'type' | 'lastMessageText' | 'lastMessageFrom' | 'lastMessageSenderName' | 'draft'>,
  showSenderName: boolean,
): boolean {
  if (conversation.type === CONVERSATION_TYPE.SINGLECHAT || !showSenderName || conversation.draft)
    return false
  const senderId = conversation.lastMessageFrom
  if (!senderId)
    return false
  if (conversation.lastMessageSenderName !== undefined)
    return !conversation.lastMessageSenderName || conversation.lastMessageSenderName === senderId
  return conversation.lastMessageText.startsWith(`${senderId}: `)
}
