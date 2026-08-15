import type { ClientConfig, CoreStores, CoreUIKitContext, CoreUIKitProviderOptions } from '@easemob/uikit-core'
import { useCoreUIKitProvider } from '@easemob/uikit-core'
import { ChatManager, ChatRoomManager, UserInfoManager } from 'easemob-websdk'
import { registerChatroomEventHandlers } from '../sdk/event/chatroom-events'
import type { ChatroomEventCallbacks } from '../sdk/event/chatroom-events'
import { useChatroomMessageStore } from '../store/chatroom-message'
import { useChatroomStore } from '../store/chatroom'
import { setChatroomMessageUserInfoConfig } from '../config/message-user-info'
import type { MessageUserInfoConfig } from '../config/message-user-info'

// 构建期注入：@easemob/uikit-chatroom 包版本（vite define，见 vite.config.ts）
declare const __EASEMOB_UIKIT_CHATROOM_VERSION__: string

/**
 * 聊天室场景的 SDK manager 注册列表。
 * core 不静态 import manager 类（tree-shaking 约束），由场景包在此注入；
 * 只含 Chat/ChatRoom/UserInfo——不含 Contact/Group/Presence/PushManager，
 * 聊天室消费者可摇掉 websdk 的无关 manager 代码。
 */
export const CHATROOM_SDK_MANAGERS: ClientConfig['managers'] = [
  ChatManager,
  ChatRoomManager,
  UserInfoManager,
]

/**
 * 注入聊天室场景默认 ClientConfig：场景 managers。
 * 不做 enableSyncData 场景默认（聊天室无会话/联系人/群，登录后无需任何同步）。
 * 业务方经 sdkConfig 显式传入时以业务配置为准。
 *
 * **`enableUserInfoSync` 必须显式关闭**：SDK 在开启用户资料同步增强时强制要求
 * `group:namecard` 能力（GroupManager，见 ChatClient.validateOptionalCapabilityDependencies），
 * 而聊天室场景只注入 [ChatManager, ChatRoomManager, UserInfoManager]（无 GroupManager，
 * tree-shake 约束），core 默认 `enableUserInfoSync ?? true` 会让初始化直接抛错。
 * （两包同装时若 IM 先初始化，core 的对齐机制会以首次配置为准，此处显式 false 不构成冲突。）
 */
export function resolveChatroomClientConfig(config: ClientConfig): ClientConfig {
  return {
    ...config,
    managers: config.managers ?? CHATROOM_SDK_MANAGERS,
    enableUserInfoSync: config.enableUserInfoSync ?? false,
  }
}

/** 聊天室场景 stores（core stores + 房间/消息流两个场景 store） */
export interface ChatroomStores extends CoreStores {
  chatroom: ReturnType<typeof useChatroomStore>
  chatroomMessage: ReturnType<typeof useChatroomMessageStore>
}

export interface ChatroomUIKitContext extends Omit<CoreUIKitContext, 'stores' | 'logout'> {
  stores: ChatroomStores
  /** 登出（core 清理 + 场景 store 清理） */
  logout: () => Promise<void>
}

export interface UseChatroomProviderOptions
  extends Omit<CoreUIKitProviderOptions, 'clientName' | 'clientVersion' | 'resolveClientConfig' | 'onClientSetup'> {
  /** 房间终态事件回调（被踢/解散，供容器弹 toast 或通知接入方） */
  chatroomCallbacks?: ChatroomEventCallbacks
  /** 消息 ext 用户信息配置（昵称/头像下沉消息 ext，P4 review 需求 3；可经 useChatroomMessageUserInfo 动态覆盖） */
  messageUserInfo?: MessageUserInfoConfig
}

/**
 * 聊天室 Provider 装配（composable 层；**不新增 Provider 概念**——
 * P2-2 的 EmChatroomContainer / 业务侧直接组合本函数即可，client/主题/i18n
 * 生命周期全部复用 core `useCoreUIKitProvider`）。
 *
 * 注入：clientName 'UIKit-Chatroom' + 版本宏 + `resolveClientConfig`
 * （managers=[ChatManager, ChatRoomManager, UserInfoManager]，auto-init 与
 * 延迟初始化路径经 core setupClient 统一生效）+ 场景事件注册。
 */
export function useChatroomProvider(
  config: ClientConfig,
  options: UseChatroomProviderOptions = {},
): ChatroomUIKitContext {
  const chatroomStore = useChatroomStore()
  const messageStore = useChatroomMessageStore()
  const { chatroomCallbacks, messageUserInfo, ...coreOptions } = options

  // 消息 ext 用户信息静态配置（P4 review 需求 3；动态覆盖走 useChatroomMessageUserInfo）
  if (messageUserInfo)
    setChatroomMessageUserInfoConfig(messageUserInfo)

  // autoInit 一律置 false，立即初始化在下方显式触发——确保 onClientSetup 闭包
  // 首次执行时已能拿到 coreCtx（同 IM 场景包的处理，见 CORE-MIGRATION-CHECKLIST Step 2 注记）。
  const coreCtx = useCoreUIKitProvider(config, {
    ...coreOptions,
    autoInit: false,
    clientName: 'UIKit-Chatroom',
    clientVersion: __EASEMOB_UIKIT_CHATROOM_VERSION__,
    resolveClientConfig: resolveChatroomClientConfig,
    onClientSetup: client =>
      registerChatroomEventHandlers(client, {
        chatroom: chatroomStore,
        chatroomMessage: messageStore,
        client: coreCtx.stores.client,
      }, chatroomCallbacks),
  })

  // 立即初始化：仅当 auto-init 未关闭且已提供 appKey（语义同 core 的 auto-init）
  if (options.autoInit !== false && config.appKey) {
    coreCtx.init(config)
  }

  async function logout(): Promise<void> {
    await coreCtx.logout()
    chatroomStore.reset()
    messageStore.clearAll()
  }

  return {
    ...coreCtx,
    stores: {
      ...coreCtx.stores,
      chatroom: chatroomStore,
      chatroomMessage: messageStore,
    },
    logout,
  }
}
