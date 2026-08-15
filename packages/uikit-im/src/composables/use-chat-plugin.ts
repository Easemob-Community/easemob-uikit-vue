import { inject, provide, type InjectionKey, type ComputedRef } from 'vue'
import type { LocationMessageBody, UiConversation, UiMessage } from '../sdk/types'
import type { MentionContact } from '../modules/chat/types'
import { createLogger } from '../utils/logger'

const logger = createLogger('UIKit:UseChatPlugin')

/** 聊天插件可使用的消息发送能力 */
export interface ChatPluginSendUtils {
  /** 发送文本消息 */
  sendTextMessage: (text: string, ext?: Record<string, any>) => Promise<any>
  /** 发送自定义消息 */
  sendCustomMessage: (event: string, params?: Record<string, string>, ext?: Record<string, any>) => Promise<any>
  /** 发送图片消息，支持 File 或图片 URL */
  sendImageMessage: (data: File | string, ext?: Record<string, any>) => Promise<any>
  /** 发送文件消息 */
  sendFileMessage: (file: File, ext?: Record<string, any>) => Promise<any>
  /** 发送语音消息 */
  sendAudioMessage: (file: File, duration: number, ext?: Record<string, any>) => Promise<any>
  /** 发送视频消息 */
  sendVideoMessage: (file: File, duration: number, ext?: Record<string, any>) => Promise<any>
  /** 发送位置消息 */
  sendLocationMessage: (body: LocationMessageBody, ext?: Record<string, any>) => Promise<any>
}

/** 聊天插件上下文 */
export interface ChatPluginContext {
  /** 当前会话 */
  currentConversation: ComputedRef<UiConversation | null | undefined>
  /** 当前登录用户 ID */
  currentUserId: ComputedRef<string | null | undefined>
  /** 消息发送能力 */
  send: ChatPluginSendUtils
  /** 获取用户信息（备注 > 用户资料昵称 > ID） */
  getUserDisplayName: (userId: string) => string
  /** 获取用户头像 */
  getUserAvatar: (userId: string) => string | undefined
}

/** 输入框插件上下文 */
export interface MessageInputPluginContext {
  /** 设置输入框文本 */
  setText: (text: string) => void
  /** 获取输入框文本 */
  getText: () => string
  /** 聚焦输入框 */
  focus: () => void
  /** 在光标/末尾插入 @提及 */
  appendMention: (contact: MentionContact) => void
}

/** 合并后的 chat plugin 上下文 */
export interface ChatPluginMergedContext extends ChatPluginContext, MessageInputPluginContext {}

const chatPluginKey: InjectionKey<ChatPluginContext> = Symbol('chat-plugin')
const messageInputPluginKey: InjectionKey<MessageInputPluginContext> = Symbol('message-input-plugin')

/**
 * 在 Chat 组件中提供插件上下文
 */
export function provideChatPluginContext(context: ChatPluginContext) {
  provide(chatPluginKey, context)
}

/**
 * 在 MessageInput 组件中提供插件上下文
 */
export function provideMessageInputPluginContext(context: MessageInputPluginContext) {
  provide(messageInputPluginKey, context)
}

/**
 * 供 plugin 组件使用：获取 UIKIT 聊天上下文与输入框操作能力
 *
 * 可在以下插槽/组件中调用：
 * - #toolbar-extra / #input-panel
 * - #message-custom / #message-action-extra
 */
export function useChatPlugin(): ChatPluginMergedContext {
  const chatContext = inject(chatPluginKey)
  const inputContext = inject(messageInputPluginKey)

  if (!chatContext) {
    throw new Error('[useChatPlugin] must be used inside EmChatContainer')
  }

  const noopInput: MessageInputPluginContext = {
    setText: () => { logger.warn('[useChatPlugin] setText not available') },
    getText: () => '',
    focus: () => { logger.warn('[useChatPlugin] focus not available') },
    appendMention: () => { logger.warn('[useChatPlugin] appendMention not available') },
  }

  return {
    ...chatContext,
    ...(inputContext || noopInput),
  }
}
