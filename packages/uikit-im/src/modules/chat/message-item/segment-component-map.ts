import type { Component } from 'vue'
import { MESSAGE_TYPE } from '@easemob-community/uikit-core'
import TextMessage from './text-message.vue'
import ImageMessage from './image-message.vue'
import VoiceMessage from './voice-message.vue'
import VideoMessage from './video-message.vue'
import FileMessage from './file-message.vue'
import CustomMessage from './custom-message.vue'
import LocationMessage from './location-message.vue'

/** 复合分段与主消息渲染器共用的七类内容组件映射。 */
export const segmentMessageComponentMap: Record<string, Component> = {
  [MESSAGE_TYPE.TEXT]: TextMessage,
  [MESSAGE_TYPE.IMAGE]: ImageMessage,
  [MESSAGE_TYPE.VOICE]: VoiceMessage,
  [MESSAGE_TYPE.VIDEO]: VideoMessage,
  [MESSAGE_TYPE.FILE]: FileMessage,
  [MESSAGE_TYPE.CUSTOM]: CustomMessage,
  [MESSAGE_TYPE.LOCATION]: LocationMessage,
}
