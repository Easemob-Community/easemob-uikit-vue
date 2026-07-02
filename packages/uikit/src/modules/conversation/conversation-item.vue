<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLongPress } from '../../composables/use-long-press'
import Avatar from '../../components/avatar/avatar.vue'
import Badge from '../../components/badge/badge.vue'
import Icon from '../../components/icon/icon.vue'
import Popup from '../../components/popup/popup.vue'
import ActionSheet from '../../components/action-sheet/action-sheet.vue'
import { useLocale } from '../../locale'
import { useViewport } from '../../composables/use-viewport'
import type { UiConversation as Conversation } from '../../sdk/types'
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
  (e: 'custom-action', key: string, conversation: Conversation): void
}>()

const { t } = useLocale()
const { isMobile } = useViewport()

const itemRef = ref<HTMLElement>()

/** H5 长按 ActionSheet */
const showActionSheet = ref(false)
const preventClick = ref(false)

const longPress = useLongPress(() => {
  if (!isMobile.value)
    return
  preventClick.value = true
  showActionSheet.value = true
})

/** PC 右键菜单 - 使用 Popup 锚定模式 */
const showContextMenu = ref(false)
const contextMenuAnchor = ref<HTMLElement>()

function onContextMenu(e: MouseEvent) {
  if (isMobile.value) {
    return
  }
  e.preventDefault()

  // 如果已有菜单打开，先清理
  if (contextMenuAnchor.value) {
    document.body.removeChild(contextMenuAnchor.value)
    contextMenuAnchor.value = undefined
  }

  // 创建临时锚点元素在右键点击位置
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = `${e.clientX}px`
  el.style.top = `${e.clientY}px`
  el.style.width = '1px'
  el.style.height = '1px'
  document.body.appendChild(el)
  contextMenuAnchor.value = el
  showContextMenu.value = true
}

function onContextMenuClose() {
  showContextMenu.value = false
  if (contextMenuAnchor.value) {
    document.body.removeChild(contextMenuAnchor.value)
    contextMenuAnchor.value = undefined
  }
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
        }
        else {
          emit('custom-action', custom.key, props.conversation)
        }
      },
    })
  })

  return actions
})

const actionSheetActions = computed(() => {
  return mergedActions.value
    .filter(a => a.position === 'mobile' || a.position === 'both')
    .map(a => ({ name: a.label, color: a.color, icon: a.icon }))
})

const contextMenuItems = computed(() => {
  return mergedActions.value
    .filter(a => a.position === 'pc' || a.position === 'both')
    .map(a => ({ label: a.label, action: a.key, danger: a.danger, icon: a.icon }))
})

function onActionSheetSelect(_item: { name: string, color?: string, icon?: string }, index: number) {
  const mobileActions = mergedActions.value.filter(
    a => a.position === 'mobile' || a.position === 'both',
  )
  mobileActions[index]?.handler()
}

function onContextMenuItemClick(actionKey: string) {
  onContextMenuClose()
  const action = mergedActions.value.find(a => a.key === actionKey)
  action?.handler()
}

/** ===== 显示内容计算 ===== */

/** 显示时间：优先取草稿时间，其次取最后消息时间 */
const displayTime = computed(() => {
  const timestamp = props.conversation.draftTime || props.conversation.lastMessageTime
  if (!timestamp)
    return ''
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
  if (false) {
    return t('message.combine') || '[聊天记录]'
  }
  if (props.messageFormatter) {
    return props.messageFormatter(
      props.conversation.lastMessageText || '',
      'text',
    )
  }
  return props.conversation.lastMessageText || ''
})
</script>

<template>
  <div
    ref="itemRef"
    class="conversation-item"
    :class="[props.class, { 'is-pinned': conversation.isPinned, 'is-muted': conversation.isMuted, 'has-at-me': props.hasAtMe }]"
    @click="onClick"
    @contextmenu="onContextMenu"
    @touchstart="longPress.start"
    @touchmove="longPress.move"
    @touchend="longPress.end"
    @touchcancel="longPress.cancel"
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
  <Popup
    :show="showContextMenu"
    :anchor="contextMenuAnchor"
    placement="bottom"
    :overlay="false"
    :close-on-click-overlay="true"
    group="conversation-context-menu"
    @update:show="onContextMenuClose"
    @close="onContextMenuClose"
  >
    <div class="context-menu">
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
  </Popup>

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
  padding: 12px var(--uikit-item-hover-padding-x, 16px);
  margin: 0 var(--uikit-item-hover-margin-x, 0px);
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
  -webkit-touch-callout: none;
  user-select: none;
  border-radius: var(--uikit-item-hover-radius, 0px);
}

.conversation-item.is-pinned {
  background-color: rgba(var(--uikit-primary-rgb, 59, 130, 246), 0.04);
  border-radius: var(--uikit-item-active-radius, 0px);
}

.conversation-item:hover {
  background-color: var(--uikit-bg-secondary);
  border-radius: var(--uikit-item-hover-radius, 0px);
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

/* PC 右键菜单 —— 卡片：白底圆角 + 细边 + 柔和阴影 + 内 padding */
.context-menu {
  display: flex;
  flex-direction: column;
  background: var(--uikit-bg-base);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 12px);
  box-shadow: var(--uikit-shadow, 0 10px 32px rgba(0, 0, 0, 0.14));
  min-width: 160px;
  padding: 6px;
}

/* 菜单项 —— 自身带圆角，hover 时是独立的圆角色块（不贴卡片边） */
.context-menu__item {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu__item:hover {
  background-color: var(--uikit-bg-hover, #f3f4f6);
}

.context-menu__item.is-danger {
  color: var(--uikit-danger-color, #ef4444);
}

.context-menu__item.is-danger:hover {
  background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
}
</style>
