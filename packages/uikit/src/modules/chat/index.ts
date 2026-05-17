// Chat Module
// 对外统一使用 Em 前缀，避免与业务方组件命名冲突
export { default as EmChat } from './chat.vue'
export { default as EmMessageList } from './message-list/message-list.vue'
export { default as EmMessageInput } from './message-input.vue'
export { default as EmChatInfoDrawer } from './drawer/chat-info-drawer.vue'
export { default as EmMessageVirtualList } from './message-list/message-virtual-list.vue'
export { default as EmMessageRenderer } from './message-item/message-renderer.vue'
export { default as EmMessageBubbleWrapper } from './message-item/message-bubble-wrapper.vue'
export { default as EmMessageInteractive } from './message-item/message-interactive.vue'
export { default as EmMessageActionMenu } from './message-action-menu/message-action-menu.vue'
export { default as EmTextMessage } from './message-item/text-message.vue'
export { default as EmImageMessage } from './message-item/image-message.vue'
export { default as EmVoiceMessage } from './message-item/voice-message.vue'
export { default as EmVideoMessage } from './message-item/video-message.vue'
export { default as EmFileMessage } from './message-item/file-message.vue'
export { default as EmSimpleInput } from './message-input/simple-input.vue'
export { default as EmRichInput } from './message-input/rich-input.vue'
export { default as EmMentionPicker } from './mention/mention-picker.vue'

export { default as EmGroupReadReceiptModal } from './group-read-receipt-modal/group-read-receipt-modal.vue'
export { default as EmForwardModal } from './forward-modal/forward-modal.vue'

// Types
export type { ChatConfig, MessageActionItem, MessageActionEvent, MessageActionType, MentionContact } from './types'
