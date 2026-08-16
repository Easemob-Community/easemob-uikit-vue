// @easemob/uikit-chatroom 聊天室场景包入口（P2 完整落地：P2-1 无头内核 +
// P2-2 容器/UI/demo）。显式具名导出，不用 export * 跨包 re-export core 符号
// （normalizeUserId 等共享工具由 core 定义，本包 re-export 保持 API 兼容）。

// 主题入口（构建时经 vite 收拢为 dist/theme/index.css；当前整体复用 core 变量）
import './theme/index.css'

// locale 合并（chatroom.* 前缀段，import 即经 core mergeLocaleMessages 并入）
import './locale'

// 常量（枚举字符串统一出口）
export {
  CHATROOM_CONVERSATION_TYPE,
  CHATROOM_STATUS,
  CHATROOM_MEMBER_ROLE,
  CHATROOM_PERMISSION,
  CHATROOM_MESSAGE_DEFAULTS,
  CHATROOM_ATTR_PREFIX,
  CHATROOM_SCENE_NAME,
  CHATROOM_GIFT_EVENT,
  CHATROOM_GIFT_ITEMS,
  CHATROOM_MIC_QUEUE_SEAT_COUNT,
} from './constants'
export type {
  ChatroomConversationTypeValue,
  ChatroomStatusValue,
  ChatroomMemberRoleValue,
  ChatroomPermissionValue,
  ChatroomAttrPrefixValue,
  ChatroomSceneNameValue,
} from './constants'

// sdk 层：domain 类型
export type {
  Chatroom,
  ChatroomMember,
  ChatroomMuteItem,
  ChatroomAnnouncement,
  ChatroomAttributes,
  ChatroomMemberPage,
  ChatroomAttributeMutationResult,
} from './sdk/domain/chatroom-domain'
export {
  toChatroom,
  toChatroomMember,
  toChatroomMemberFromUser,
  toChatroomMuteItem,
} from './sdk/domain/chatroom-domain'

// sdk 层：adapter
export { ChatroomAdapter, normalizeUserId, toChatroomUiMessage } from './sdk/adapter/chatroom-adapter'

// sdk 层：事件注册
export { registerChatroomEventHandlers, subscribeMemberJoined } from './sdk/event/chatroom-events'
export type {
  ChatroomEventStores,
  ChatroomEventCallbacks,
  MemberJoinedPayload,
} from './sdk/event/chatroom-events'

// stores
export { useChatroomStore } from './store/chatroom'
export { useChatroomMessageStore } from './store/chatroom-message'

// composables
export { useChatroom } from './composables/use-chatroom'
export type { UseChatroomOptions } from './composables/use-chatroom'
export { useChatroomMessage } from './composables/use-chatroom-message'
export type { UseChatroomMessageOptions } from './composables/use-chatroom-message'
export { useChatroomMember } from './composables/use-chatroom-member'
export { useChatroomAttributes } from './composables/use-chatroom-attributes'
export { useChatroomMessageUserInfo } from './composables/use-chatroom-message-user-info'
export type { MessageUserInfoConfig } from './config/message-user-info'
export { setChatroomMessageUserInfoConfig } from './config/message-user-info'
export {
  useChatroomScene,
  registerChatroomScene,
  resolveChatroomScene,
  LIVE_ROOM_SCENE,
  VOICE_ROOM_SCENE,
  CLASS_ROOM_SCENE,
} from './composables/use-chatroom-scene'
export type {
  ChatroomSceneConfig,
  ChatroomManagementFeature,
  ChatroomSplitPanels,
  ChatroomPopupModeValue,
} from './composables/use-chatroom-scene'
// PC 模式（P5）：布局解析 + 弹层形态解析
export { useChatroomLayout } from './composables/use-chatroom-layout'
export type { ChatroomLayoutValue, ChatroomLayoutResolveValue } from './composables/use-chatroom-layout'
export { useChatroomPopupMode } from './composables/use-chatroom-popup-mode'
export type { ChatroomPopupModeResolvedValue } from './composables/use-chatroom-popup-mode'
export {
  useChatroomProvider,
  resolveChatroomClientConfig,
  CHATROOM_SDK_MANAGERS,
} from './composables/use-chatroom-provider'
export type {
  ChatroomUIKitContext,
  ChatroomStores,
  UseChatroomProviderOptions,
} from './composables/use-chatroom-provider'

// 容器（P2-2：EmChatroomContainer 外壳，消费公开 composable 契约）
export { default as EmChatroomContainer } from './containers/chatroom-container/chatroom-container.vue'
export type {
  ChatroomContainerProps,
  ChatroomContainerEmits,
  ChatroomSignalRoomConfig,
  ChatroomMemberJoinedPayload,
} from './containers/chatroom-container/types'
// 直播 overlay UI 组件集（P4 review：直播场景自绘弹幕/横幅/商品卡/输入区/抽奖入口）
export {
  ChatroomLiveTopBar,
  ChatroomLiveDanmakuStream,
  ChatroomLiveWelcomeBanner,
  ChatroomLiveInteractiveCard,
  ChatroomLiveOverlayManager,
  ChatroomLiveFullscreenEffect,
  ChatroomLiveInputBar,
  ChatroomLiveLotteryEntry,
  maskUsername,
  CHAT_KINDS,
  isChatKind,
  isNotificationKind,
  NOTIFICATION_KINDS,
} from './modules/chatroom'
export type { LiveDanmakuItem, LiveDanmakuKind, LiveDanmakuZone, LiveDanmakuStreamProps, LiveOverlayAnchor, LiveOverlayItem, LiveFullscreenEffectItem } from './modules/chatroom'
// PC 模式 UI（P5）：split 分栏布局 / 成员常驻侧栏 / 上下文菜单
export {
  ChatroomSplitLayout,
  ChatroomMemberSidebar,
  ChatroomContextMenu,
} from './modules/chatroom'
export type {
  ChatroomSplitLayoutProps,
  ChatroomMemberSidebarProps,
  ChatroomContextMenuItem,
  ChatroomContextMenuProps,
} from './modules/chatroom'
// 信令房透传/状态 payload（P3 多房间订阅，§5.9）
export type { SignalMessagePayload, SignalStatusPayload } from './sdk/event/chatroom-events'

// locale 文案表（供业务方查阅/二次合并）
export { chatroomLocaleZhCN, chatroomLocaleEn } from './locale'

// 弹层 Teleport 目标（嵌套弹层容器场景，如 demo 手机壳；默认 body）
export { setChatroomPopupTarget, getChatroomPopupTarget } from './config/popup-target'
