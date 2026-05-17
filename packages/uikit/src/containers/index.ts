// Container Components
// 对外统一使用 Em 前缀，避免与业务方组件命名冲突
export { default as EmUIKitProvider } from './uikit-provider/uikit-provider.vue'
export { default as EmChatContainer } from './chat-container/chat-container.vue'
export { default as EmConversationContainer } from './conversation-container/conversation-container.vue'
export { default as EmContactContainer } from './contact-container/contact-container.vue'
export { default as EmAddressBookContainer } from './address-book-container/address-book-container.vue'
export { default as EmContactListContainer } from './contact-list-container/contact-list-container.vue'
export { default as EmGroupListContainer } from './group-list-container/group-list-container.vue'

export type {
  ContactContainerProps,
  ContactContainerView,
  ContactContainerEntryKey,
  ContactContainerTransition,
} from './contact-container/contact-container.vue'
export type {
  AddressBookContainerProps,
  AddressBookContainerView,
  AddressBookContainerEntry,
  AddressBookContainerEntryKey,
  AddressBookContainerTransition,
} from './address-book-container/address-book-container.vue'
export type { ContactListContainerProps } from './contact-list-container/contact-list-container.vue'
export type { GroupListContainerProps } from './group-list-container/group-list-container.vue'
