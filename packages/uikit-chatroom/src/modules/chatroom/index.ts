/**
 * 聊天室业务块桶（modules/chatroom，按场景分目录，P3）：
 * - common/：通用业务块（header / input-bar / message-item / member-item / member-panel / notice-banner）；
 * - live/：直播场景块（gift-bar 礼物栏）；
 * - voice/：语聊房场景块（mic-queue 麦位）。
 * 模块组件为容器内部实现，不对外导出（业务定制经容器命名插槽）；
 * 此桶供容器与 story/demo 直接引用。
 */
export { default as ChatroomHeader } from './common/chatroom-header.vue'
export { default as ChatroomInputBar } from './common/chatroom-input-bar.vue'
export { default as ChatroomMemberItem } from './common/chatroom-member-item.vue'
export { default as ChatroomMemberPanel } from './common/chatroom-member-panel.vue'
export { default as ChatroomMessageItem } from './common/chatroom-message-item.vue'
export { default as ChatroomNoticeBanner } from './common/chatroom-notice-banner.vue'
export { default as ChatroomGiftBar } from './live/chatroom-gift-bar.vue'
export { default as ChatroomMicQueue } from './voice/chatroom-mic-queue.vue'
