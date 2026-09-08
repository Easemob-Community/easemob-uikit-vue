<script setup lang="ts">
import { ref, useSlots } from 'vue'
import Chat from '../../modules/chat/chat.vue'
import { useUIKit } from '../../composables/use-uikit'
import type { ChatConfig } from '../../modules/chat/types'
import type { ForwardModeValue } from '@easemob/uikit-core'
import type { LocationMessageBody, UiMessage } from '@easemob/uikit-core'

/** #user-card 插槽作用域 */
export interface ChatContainerUserCardSlotScope {
  show: boolean
  userId: string
  open: () => void
  close: () => void
}

/** #group-card 插槽作用域 */
export interface ChatContainerGroupCardSlotScope {
  show: boolean
  groupId: string
  open: () => void
  close: () => void
}

/** #invite-member 插槽作用域 */
export interface ChatContainerInviteMemberSlotScope {
  show: boolean
  groupId: string
  existingMemberIds: string[]
  open: (groupId: string) => void
  close: () => void
}

/** #forward 插槽作用域 */
export interface ChatContainerForwardSlotScope {
  show: boolean
  messages: UiMessage[]
  mode: ForwardModeValue
  open: (messages: UiMessage[], mode?: ForwardModeValue) => void
  close: () => void
}

/** #message-search 插槽作用域 */
export interface ChatContainerMessageSearchSlotScope {
  show: boolean
  config: Record<string, any> | undefined
  locate: (payload: { msgId: string, conversationId: string }) => void
  open: () => void
  close: () => void
}

/** #multi-select-bar 插槽作用域 */
export interface ChatContainerMultiSelectBarSlotScope {
  visible: boolean
  selectedMessages: UiMessage[]
  totalMessages: number
  selectAll: () => void
  deselectAll: () => void
  forwardOneByOne: () => void
  forwardCombine: () => void
  delete: (messages: UiMessage[]) => void
  close: () => void
}

export interface ChatContainerProps {
  /** 聊天页面配置 */
  config?: ChatConfig
  /** 是否处于全局加载状态 */
  loading?: boolean
  /** 自定义根元素 class */
  class?: string
  /** 自定义根元素 style */
  style?: Record<string, string>
  /**
   * 容器风格变体（与 ConversationContainer 同口径）：
   * compact（默认；平铺无圆角，背景 --uikit-chat-bg 铺满，适合接入方自行排版）/
   * card（圆角卡片：圆角跟随 --uikit-components-radius，细分隔线边框，宿主提供灰底与间距即可成卡）
   */
  variant?: 'card' | 'compact'
}

export interface ChatContainerEmits {
  (e: 'recall-failed', error: any, message: UiMessage): void
  (e: 'at-me-click', userId: string): void
  (e: 'location-click', body: LocationMessageBody, message: UiMessage): void
  (e: 'custom-message-action', action: string, payload: any, message: UiMessage): void
}

const props = withDefaults(defineProps<ChatContainerProps>(), {
  variant: 'compact',
})
const emit = defineEmits<ChatContainerEmits>()

const chatRef = ref<InstanceType<typeof Chat>>()

const { h5 } = useUIKit()
const slots = useSlots()

/** 除 #drawer / #watermark 外的其余插槽名（两者单独显式透传以保留类型；useSlots 非响应式，无需 computed） */
function getOtherSlotNames() {
  return Object.keys(slots).filter(name => name !== 'drawer' && name !== 'watermark')
}

defineExpose({
  setText: (text: string) => chatRef.value?.setText?.(text),
  getText: () => chatRef.value?.getText?.() || '',
})
</script>

<template>
  <div
    class="chat-container"
    :class="{
      'chat-container--keyboard-open': h5.isKeyboardOpen.value,
      [`chat-container--${props.variant}`]: true,
    }"
  >
    <Chat
      ref="chatRef"
      :config="props.config"
      :loading="props.loading"
      :class="props.class"
      :style="props.style"
      @recall-failed="(err: any, msg: UiMessage) => emit('recall-failed', err, msg)"
      @at-me-click="(userId: string) => emit('at-me-click', userId)"
      @location-click="(body: LocationMessageBody, msg: UiMessage) => emit('location-click', body, msg)"
      @custom-message-action="(action: string, payload: any, msg: UiMessage) => emit('custom-message-action', action, payload, msg)"
    >
      <!-- 透传空状态插槽 -->
      <template #empty>
        <slot name="empty" />
      </template>
      <!-- 透传加载状态插槽 -->
      <template #loading>
        <slot name="loading" />
      </template>
      <!-- 透传错误边界插槽 -->
      <template #error="slotProps">
        <slot name="error" v-bind="slotProps" />
      </template>
      <!-- 透传 header 插槽 -->
      <template #header="slotProps">
        <slot name="header" v-bind="slotProps" />
      </template>
      <template #header-avatar="slotProps">
        <slot name="header-avatar" v-bind="slotProps" />
      </template>
      <template #header-title="slotProps">
        <slot name="header-title" v-bind="slotProps" />
      </template>
      <template #header-subtitle="slotProps">
        <slot name="header-subtitle" v-bind="slotProps" />
      </template>
      <template #header-extra="slotProps">
        <slot name="header-extra" v-bind="slotProps" />
      </template>
      <!-- 透传 drawer 插槽（显式声明以保留 ChatDrawerSlotScope 类型提示） -->
      <template #drawer="slotProps">
        <slot name="drawer" v-bind="slotProps" />
      </template>
      <!-- 透传名片 / 邀请 / 转发 / 搜索 / 多选栏插槽（显式声明以保留作用域类型提示） -->
      <template #user-card="slotProps">
        <slot name="user-card" v-bind="slotProps" />
      </template>
      <template #group-card="slotProps">
        <slot name="group-card" v-bind="slotProps" />
      </template>
      <template #invite-member="slotProps">
        <slot name="invite-member" v-bind="slotProps" />
      </template>
      <template #forward="slotProps">
        <slot name="forward" v-bind="slotProps" />
      </template>
      <template #message-search="slotProps">
        <slot name="message-search" v-bind="slotProps" />
      </template>
      <template #multi-select-bar="slotProps">
        <slot name="multi-select-bar" v-bind="slotProps" />
      </template>
      <!-- 透传水印覆盖层插槽（显式声明以保留作用域类型提示） -->
      <template #watermark="slotProps">
        <slot name="watermark" v-bind="slotProps" />
      </template>
      <!-- 透传所有消息类型级插槽（如 #message-txt, #message-footer-txt 等） -->
      <template
        v-for="name in getOtherSlotNames()"
        :key="name"
        #[name]="slotProps"
      >
        <slot :name="name" v-bind="slotProps" />
      </template>
    </Chat>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* border-box：card 档 1px 边框与 H5 safe-bottom padding 不额外撑高容器，避免宿主出现滚动条 */
  box-sizing: border-box;
  /* 使用 background 简写，支持颜色/渐变/图片 */
  background: var(--uikit-chat-bg);
  padding-bottom: var(--uikit-safe-bottom, 0px);
}

/* card 档位：容器自成圆角卡片（与 ConversationContainer card 同口径）。
   圆角跟随主题 componentsShape；细边框取 --uikit-border-light（与灰底页面分界）；
   overflow 裁剪内部 header/输入区直角。灰底与间距由宿主布局提供（参照 demo-layout） */
.chat-container--card {
  border: 1px solid var(--uikit-border-light, #f3f4f6);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
}

/* 键盘弹起时输入框已由 keyboardHeight padding 顶起，去掉容器这份 safe-bottom，避免双重叠加 */
.chat-container--keyboard-open {
  padding-bottom: 0;
}
</style>
