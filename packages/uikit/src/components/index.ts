// Base UI Components
// 对外统一使用 Em 前缀，避免与业务方组件命名冲突
export { default as EmButton } from './button/button.vue'
export { default as EmIconButton } from './icon-button/icon-button.vue'
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
export { default as EmUserCard } from './user-card/user-card.vue'
export { default as EmUserCardModal } from './user-card/user-card-modal.vue'
export { default as EmGroupCard } from './group-card/group-card.vue'
export { default as EmGroupCardModal } from './group-card/group-card-modal.vue'
export { default as EmPresenceSelector } from './presence-selector/presence-selector.vue'
export { default as EmPresenceSelectorModal } from './presence-selector/presence-selector-modal.vue'
export { default as EmPresenceSelectorPopup } from './presence-selector/presence-selector-popup.vue'
export { default as EmPresenceAvatar } from './presence-avatar/presence-avatar.vue'
export { default as EmCell } from './cell/cell.vue'
export type { CellProps } from './cell/cell.vue'
export { default as EmEmpty } from './empty/empty.vue'
export type { EmptyProps } from './empty/empty.vue'
export type { PresenceDisplayStatus } from './avatar/avatar.vue'

export const componentList = [
  'em-button',
  'em-icon-button',
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
  'em-user-card',
  'em-user-card-modal',
  'em-group-card',
  'em-group-card-modal',
  'em-presence-selector',
  'em-presence-selector-modal',
  'em-presence-selector-popup',
  'em-presence-avatar',
  'em-cell',
  'em-empty',
] as const
