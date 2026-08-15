/**
 * 聊天室业务块桶（modules/chatroom，按场景分目录，P3）：
 * - common/：通用业务块（header / input-bar / message-item / member-item / member-panel / notice-banner）；
 * - live/：直播场景块（gift-bar 礼物栏 + 直播 overlay UI 组件集，P4 review）；
 * - voice/：语聊房场景块（mic-queue 麦位）。
 * 模块组件为容器内部实现，不对外导出（业务定制经容器命名插槽）；
 * 直播 overlay 组件集（LiveTopBar/DanmakuStream/WelcomeBanner/ProductCard/
 * InputBar/LotteryEntry）经包入口对外导出（直播场景自绘 UI 的公开组件面）。
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
// 直播 overlay UI 组件集（P4 review UI 规范：自绘弹幕/横幅/商品卡/输入区）
export { default as ChatroomLiveTopBar } from './live/chatroom-live-top-bar.vue'
export { default as ChatroomLiveDanmakuStream } from './live/chatroom-live-danmaku-stream.vue'
export type { LiveDanmakuItem } from './live/chatroom-live-danmaku-stream.vue'
export { default as ChatroomLiveWelcomeBanner } from './live/chatroom-live-welcome-banner.vue'
export { default as ChatroomLiveProductCard } from './live/chatroom-live-product-card.vue'
export type { LiveProduct } from './live/chatroom-live-product-card.vue'
export { default as ChatroomLiveInputBar } from './live/chatroom-live-input-bar.vue'
export { default as ChatroomLiveLotteryEntry } from './live/chatroom-live-lottery-entry.vue'
export { maskUsername } from './live/mask-username'
