import type { Conversation } from '../../store/conversation'

export interface ConversationAction {
  key: string
  label: string
  icon?: string
  color?: string
  danger?: boolean
  position?: 'mobile' | 'pc' | 'both'
  handler?: (conversation: Conversation) => void | Promise<void>
}
