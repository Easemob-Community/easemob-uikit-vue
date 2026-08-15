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
export { registerChatroomEventHandlers } from './sdk/event/chatroom-events'
export type { ChatroomEventStores, ChatroomEventCallbacks } from './sdk/event/chatroom-events'

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
export {
  useChatroomScene,
  registerChatroomScene,
  resolveChatroomScene,
} from './composables/use-chatroom-scene'
export type { ChatroomSceneConfig } from './composables/use-chatroom-scene'
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
} from './containers/chatroom-container/types'

// locale 文案表（供业务方查阅/二次合并）
export { chatroomLocaleZhCN, chatroomLocaleEn } from './locale'
