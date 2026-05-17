// Base UI Components
// 对外统一使用 Em 前缀，避免与业务方组件命名冲突
export { default as EmButton } from './button/button.vue'
export { default as EmAvatar } from './avatar/avatar.vue'
export { default as EmBadge } from './badge/badge.vue'
export { default as EmIcon } from './icon/icon.vue'
export { default as EmInput } from './input/input.vue'
export { default as EmPopup } from './popup/popup.vue'
export { default as EmModal } from './modal/modal.vue'
export { default as EmToast } from './toast/toast.vue'
export { default as EmActionSheet } from './action-sheet/action-sheet.vue'
export { default as EmScrollToTop } from './scroll-to-top/scroll-to-top.vue'
export { default as EmEmojiPicker } from './emoji-picker/emoji-picker.vue'

export const componentList = [
  'em-button',
  'em-avatar',
  'em-badge',
  'em-icon',
  'em-input',
  'em-popup',
  'em-modal',
  'em-toast',
  'em-action-sheet',
  'em-scroll-to-top',
  'em-emoji-picker',
] as const
