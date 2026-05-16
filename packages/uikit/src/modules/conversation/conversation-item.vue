<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLongPress, onClickOutside } from '@vueuse/core'
import Avatar from '../../components/avatar/avatar.vue'
import Badge from '../../components/badge/badge.vue'
import Icon from '../../components/icon/icon.vue'
import ActionSheet from '../../components/action-sheet/action-sheet.vue'
import { useLocale } from '../../locale'
import { useViewport } from '../../composables/use-viewport'
import { CONVERSATION_TYPE } from '../../constants'
import type { Conversation } from '../../store/conversation'
import type { ConversationAction } from './types'

export interface ConversationItemProps {
  conversation: Conversation
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
  customActions?: ConversationAction[]
  /** 时间格式化函数 */
  timeFormatter?: (timestamp: number) => string
  /** 消息摘要格式化函数 */
  messageFormatter?: (msg: string, type?: string) => string
  /** 群聊是否显示发送者名称 */
  showSenderName?: boolean
  /** 未读数显示模式 */
  unreadMode?: 'count' | 'dot'
  /** 是否有人@我 */
  hasAtMe?: boolean
}

const props = withDefaults(defineProps<ConversationItemProps>(), {
  customActions: () => [],
  showSenderName: true,
  unreadMode: 'count',
  hasAtMe: false,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'pin', id: string, isPinned: boolean): void
  (e: 'delete', id: string): void
  (e: 'read', id: string): void
  (e: 'customAction', key: string, conversation: Conversation): void
}>()

const { t } = useLocale()
const { isMobile } = useViewport()

const itemRef = ref<HTMLElement>()
const contextMenuRef = ref<HTMLElement>()

/** H5 长按 ActionSheet - VueUse onLongPress */
const showActionSheet = ref(false)
const preventClick = ref(false)

onLongPress(
  itemRef,
  () => {
    if (!isMobile.value) return
    preventClick.value = true
    showActionSheet.value = true
  },
  { delay: 600 }
)

/** PC 右键菜单 - VueUse onClickOutside 自动关闭 */
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })

onClickOutside(contextMenuRef, () => {
  showContextMenu.value = false
})

function onContextMenu(e: MouseEvent) {
  if (isMobile.value) return
  e.preventDefault()
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

/** 点击选择 */
function onClick() {
  if (preventClick.value) {
    preventClick.value = false
    return
  }
  emit('select', props.conversation.id)
}

/** ===== 操作项 ===== */
interface MergedAction {
  key: string
  label: string
  icon?: string
  color?: string
  danger?: boolean
  position: 'mobile' | 'pc' | 'both'
  handler: () => void
}

const mergedActions = computed<MergedAction[]>(() => {
  const actions: MergedAction[] = []

  if (props.conversation.unreadCount) {
    actions.push({
      key: 'read',
      label: t('conversation.read'),
      icon: 'chat/doneAll',
      handler: () => emit('read', props.conversation.id),
      position: 'both',
    })
  }

  actions.push({
    key: 'pin',
    label: props.conversation.isPinned ? t('conversation.unpin') : t('conversation.pin'),
    icon: props.conversation.isPinned ? 'arrows/arrow_n_line' : 'arrows/line_n_arrow',
    handler: () => emit('pin', props.conversation.id, !props.conversation.isPinned),
    position: 'both',
  })

  actions.push({
    key: 'delete',
    label: t('conversation.delete'),
    icon: 'actions/trash',
    color: '#ef4444',
    danger: true,
    handler: () => emit('delete', props.conversation.id),
    position: 'both',
  })

  props.customActions?.forEach((custom) => {
    actions.push({
      key: custom.key,
      label: custom.label,
      icon: custom.icon,
      color: custom.color,
      danger: custom.danger,
      position: custom.position || 'both',
      handler: () => {
        if (custom.handler) {
          custom.handler(props.conversation)
        } else {
          emit('customAction', custom.key, props.conversation)
        }
      },
    })
  })

  return actions
})

const actionSheetActions = computed(() => {
  return mergedActions.value
    .filter((a) => a.position === 'mobile' || a.position === 'both')
    .map((a) => ({ name: a.label, color: a.color, icon: a.icon }))
})

const contextMenuItems = computed(() => {
  return mergedActions.value
    .filter((a) => a.position === 'pc' || a.position === 'both')
    .map((a) => ({ label: a.label, action: a.key, danger: a.danger, icon: a.icon }))
})

function onActionSheetSelect(_item: { name: string; color?: string; icon?: string }, index: number) {
  const mobileActions = mergedActions.value.filter(
    (a) => a.position === 'mobile' || a.position === 'both'
  )
  mobileActions[index]?.handler()
}

function onContextMenuItemClick(actionKey: string) {
  showContextMenu.value = false
  const action = mergedActions.value.find((a) => a.key === actionKey)
  action?.handler()
}

/** ===== 显示内容计算 ===== */

/** 显示时间：优先取草稿时间，其次取最后消息时间 */
const displayTime = computed(() => {
  const timestamp = props.conversation.draftTime || props.conversation.lastMessageTime
  if (!timestamp) return ''
  if (props.timeFormatter) {
    return props.timeFormatter(timestamp)
  }
  // 无 formatter 时 fallback 到简单格式
  return new Date(timestamp).toLocaleTimeString()
})

/** 是否显示草稿 */
const displayDraft = computed(() => {
  return !!props.conversation.draft
})

/** 显示消息内容：草稿优先，否则用 messageFormatter 格式化 */
const displayMessage = computed(() => {
  if (props.conversation.draft) {
    return props.conversation.draft
  }
  // 合并消息类型统一回显为 [聊天记录]
  if (props.conversation.lastMessageType === 'combine') {
    return t('message.combine') || '[聊天记录]'
  }
  if (props.messageFormatter) {
    return props.messageFormatter(
      props.conversation.lastMessage || '',
      props.conversation.lastMessageType
    )
  }
  return props.conversation.lastMessage || ''
})
</script>

<template>
  <div
    ref="itemRef"
    class="conversation-item"
    :class="[props.class, { 'is-pinned': conversation.isPinned, 'is-muted': conversation.isMuted, 'has-at-me': props.hasAtMe }]"
    @click="onClick"
    @contextmenu.prevent="onContextMenu"
  >
    <Avatar :name="props.conversation.name" :src="props.conversation.avatar" :size="48" />
    <slot name="item-prefix" />
    <div class="conversation-item__info">
      <div class="conversation-item__top">
        <div class="conversation-item__name-wrap">
          <span class="conversation-item__name" :class="{ 'is-at-me': props.hasAtMe }">
            {{ props.hasAtMe ? `[${t('conversation.atMe') || '@'}] ` : '' }}{{ props.conversation.name }}
          </span>
          <span v-if="props.conversation.isPinned" class="conversation-item__pin-badge">
            <Icon name="chat/pinned" :size="12" />
          </span>
          <span v-if="props.conversation.isMuted" class="conversation-item__mute-badge">
            <Icon name="audio-video/speaker_xmark" :size="12" />
          </span>
        </div>
        <span v-if="displayTime" class="conversation-item__time">
          {{ displayTime }}
        </span>
      </div>
      <div class="conversation-item__bottom">
        <span class="conversation-item__message">
          <span v-if="displayDraft" class="conversation-item__draft">[{{ t('conversation.draft') }}]</span>{{ displayMessage }}
        </span>
        <Badge
          v-if="props.conversation.unreadCount"
          :count="props.conversation.unreadCount"
          :dot="props.unreadMode === 'dot' || props.conversation.isMuted"
          :color="props.conversation.isMuted ? 'var(--uikit-text-secondary)' : undefined"
        />
      </div>
      <slot name="item-suffix" />
    </div>
  </div>

  <!-- PC 右键菜单 -->
  <Teleport v-if="showContextMenu" to="body">
    <div class="context-menu-overlay" @contextmenu.prevent>
      <div
        ref="contextMenuRef"
        class="context-menu"
        :style="{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }"
      >
        <div
          v-for="item in contextMenuItems"
          :key="item.action"
          class="context-menu__item"
          :class="{ 'is-danger': item.danger }"
          @click.stop="onContextMenuItemClick(item.action)"
        >
          <Icon v-if="item.icon" :name="item.icon" :size="14" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- H5 长按 ActionSheet -->
  <ActionSheet
    v-model:show="showActionSheet"
    :actions="actionSheetActions"
    @select="onActionSheetSelect"
  />
</template>

<style scoped>
.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
  -webkit-touch-callout: none;
  user-select: none;
}

.conversation-item.is-pinned {
  background-color: rgba(var(--uikit-primary-rgb, 59, 130, 246), 0.04);
}

.conversation-item:hover {
  background-color: var(--uikit-bg-secondary);
}

.conversation-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-item__top,
.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__name-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.conversation-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item__name.is-at-me {
  color: var(--uikit-primary, #3b82f6);
  font-weight: 600;
}

.conversation-item.has-at-me {
  background-color: rgba(var(--uikit-primary-rgb, 59, 130, 246), 0.06);
}

.conversation-item__pin-badge {
  display: inline-flex;
  align-items: center;
  color: var(--uikit-primary, #3b82f6);
  flex-shrink: 0;
}

.conversation-item__mute-badge {
  display: inline-flex;
  align-items: center;
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.conversation-item__time {
  font-size: 11px;
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.conversation-item__message {
  font-size: 13px;
  color: var(--uikit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.conversation-item__draft {
  color: var(--uikit-danger-color, #ef4444);
  margin-right: 2px;
}

/* PC 右键菜单 */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
}

.context-menu {
  position: absolute;
  background: var(--uikit-bg-primary, #fff);
  border: 1px solid var(--uikit-border, #e5e7eb);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  overflow: hidden;
}

.context-menu__item {
  padding: 10px 16px;
  font-size: 14px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.context-menu__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.context-menu__item.is-danger {
  color: #ef4444;
}

.context-menu__item.is-danger:hover {
  background-color: #fef2f2;
}
</style>
