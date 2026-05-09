<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useLocale } from '../../locale'
import { CONVERSATION_TYPE } from '../../constants'
import MessageList from './message-list.vue'
import MessageInput from './message-input.vue'
import ChatInfoDrawer from './chat-info-drawer.vue'
import Icon from '../../components/icon/icon.vue'
import Avatar from '../../components/avatar/avatar.vue'
import type { ChatConfig } from './types'

export interface ChatProps {
  config?: ChatConfig
}

const props = defineProps<ChatProps>()

const { currentConversation, isMultiSelectMode, selectedMessages, exitMultiSelectMode } = useChat()
const { t } = useLocale()

/** Header 配置 */
const headerConfig = computed(() => props.config?.header)

/** 是否显示 header */
const showHeader = computed(() => headerConfig.value?.visible !== false)

/** Header 对齐方式 */
const headerAlign = computed(() => headerConfig.value?.align ?? 'center')

/** 是否使用自定义 header 插槽 */
const customHeaderSlot = computed(() => headerConfig.value?.customSlot ?? false)

/** 是否显示 header 头像 */
const showHeaderAvatar = computed(() => headerConfig.value?.showAvatar ?? false)

/** 是否显示 drawer */
const showDrawer = ref(false)

/** Header 元素引用 */
const headerRef = ref<HTMLElement>()

/** Header 实际高度 */
const headerHeight = ref(0)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        headerHeight.value = h
      }
    })
    resizeObserver.observe(headerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

/** 当前会话类型 */
const conversationType = computed(() => currentConversation.value?.type)

/** 是否是群聊 */
const isGroupChat = computed(() => conversationType.value === CONVERSATION_TYPE.GROUPCHAT)

/** 多选模式底部操作 */
function onMultiSelectForward() {
  // TODO: 转发选中的消息
  exitMultiSelectMode()
}

function onMultiSelectDelete() {
  // TODO: 删除选中的消息
  exitMultiSelectMode()
}
</script>

<template>
  <div class="chat">
    <!-- Header -->
    <div
      v-if="showHeader"
      ref="headerRef"
      class="chat__header"
      :class="{
        'chat__header--align-left': headerAlign === 'left',
        'chat__header--align-center': headerAlign === 'center',
        'chat__header--align-right': headerAlign === 'right',
      }"
    >
      <slot name="header" :conversation="currentConversation">
        <!-- 头像区域 -->
        <div v-if="showHeaderAvatar && currentConversation" class="chat__header-avatar">
          <slot name="header-avatar" :conversation="currentConversation">
            <Avatar
              :src="currentConversation.avatar"
              :name="currentConversation.name"
              :size="36"
            />
          </slot>
        </div>
        <div class="chat__header-main">
          <template v-if="customHeaderSlot">
            <slot name="header-title" :conversation="currentConversation">
              <span class="chat__title">{{ currentConversation?.name || t('chat.title') }}</span>
            </slot>
            <slot name="header-extra" :conversation="currentConversation" />
          </template>
          <template v-else>
            <span class="chat__title">{{ currentConversation?.name || t('chat.title') }}</span>
          </template>
        </div>
        <button
          v-if="currentConversation"
          class="chat__header-more"
          @click.stop="showDrawer = true"
        >
          <Icon name="actions/ellipsis_vertical" :size="20" />
        </button>
      </slot>
    </div>

    <!-- 消息列表 -->
    <MessageList :config="props.config" />

    <!-- 多选模式底部操作栏 -->
    <div v-if="isMultiSelectMode" class="chat__multi-select-bar">
      <span class="chat__multi-select-count">已选 {{ selectedMessages.length }} 条</span>
      <div class="chat__multi-select-actions">
        <button class="chat__multi-select-btn" @click="onMultiSelectForward">
          转发
        </button>
        <button class="chat__multi-select-btn chat__multi-select-btn--danger" @click="onMultiSelectDelete">
          删除
        </button>
        <button class="chat__multi-select-btn" @click="exitMultiSelectMode">
          取消
        </button>
      </div>
    </div>

    <!-- 输入框 -->
    <MessageInput v-if="!isMultiSelectMode" :config="props.config" :is-group="isGroupChat" />

    <!-- 聊天信息抽屉 -->
    <ChatInfoDrawer
      v-model:show="showDrawer"
      :conversation="currentConversation"
      :is-group="isGroupChat"
      :offset-top="headerHeight"
    />
  </div>
</template>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}

.chat__header {
  position: relative;
  z-index: 101;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  min-height: 48px;
  gap: 8px;
}

.chat__header--align-left .chat__header-main {
  justify-content: flex-start;
}

.chat__header--align-center .chat__header-main {
  justify-content: center;
}

.chat__header--align-right .chat__header-main {
  justify-content: flex-end;
}

.chat__header-avatar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.chat__header-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat__header-more {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.chat__header-more:hover {
  background-color: var(--uikit-bg-secondary);
}

/* 多选模式底部栏 */
.chat__multi-select-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: var(--uikit-bg-secondary);
  border-top: 1px solid #e5e7eb;
}

.chat__multi-select-count {
  font-size: 14px;
  color: var(--uikit-text-primary);
}

.chat__multi-select-actions {
  display: flex;
  gap: 12px;
}

.chat__multi-select-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat__multi-select-btn:hover {
  opacity: 0.9;
}

.chat__multi-select-btn--danger {
  background-color: #ef4444;
}
</style>
