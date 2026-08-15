/**
 * 聊天室业务块桶（modules/chatroom）。
 * 模块组件为容器内部实现，不对外导出（业务定制经容器命名插槽）；
 * 此桶供容器与 story/demo 直接引用。
 */
export { default as ChatroomHeader } from './chatroom-header.vue'
export { default as ChatroomInputBar } from './chatroom-input-bar.vue'
export { default as ChatroomMemberItem } from './chatroom-member-item.vue'
export { default as ChatroomMemberPanel } from './chatroom-member-panel.vue'
export { default as ChatroomMessageItem } from './chatroom-message-item.vue'
export { default as ChatroomNoticeBanner } from './chatroom-notice-banner.vue'
