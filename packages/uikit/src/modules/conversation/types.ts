import type { UiConversation as Conversation } from '../../sdk/types'

export interface ConversationAction {
  key: string
  label: string
  icon?: string
  color?: string
  danger?: boolean
  position?: 'mobile' | 'pc' | 'both'
  handler?: (conversation: Conversation) => void | Promise<void>
}
