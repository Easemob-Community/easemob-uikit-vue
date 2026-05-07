<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLongPress, onClickOutside } from '@vueuse/core'
import Avatar from '../../components/avatar/avatar.vue'
import Badge from '../../components/badge/badge.vue'
import Icon from '../../components/icon/icon.vue'
import ActionSheet from '../../components/action-sheet/action-sheet.vue'
import { useLocale } from '../../locale'
import { useViewport } from '../../composables/use-viewport'
import type { Conversation } from '../../store/conversation'
import type { ConversationAction } from './types'

export interface ConversationItemProps {
  conversation: Conversation
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
  customActions?: ConversationAction[]
}

const props = withDefaults(defineProps<ConversationItemProps>(), {
  customActions: () => [],
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
      handler: () => emit('read', props.conversation.id),
      position: 'both',
    })
  }

  actions.push({
    key: 'pin',
    label: props.conversation.isPinned ? t('conversation.unpin') : t('conversation.pin'),
    handler: () => emit('pin', props.conversation.id, !props.conversation.isPinned),
    position: 'both',
  })

  actions.push({
    key: 'delete',
    label: t('conversation.delete'),
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
</script>

<template>
  <div
    ref="itemRef"
    class="conversation-item"
    :class="[props.class, { 'is-pinned': conversation.isPinned }]"
    @click="onClick"
    @contextmenu.prevent="onContextMenu"
  >
    <Avatar :name="props.conversation.name" :size="48" />
    <div class="conversation-item__info">
      <div class="conversation-item__top">
        <div class="conversation-item__name-wrap">
          <span class="conversation-item__name">{{ props.conversation.name }}</span>
          <span v-if="props.conversation.isPinned" class="conversation-item__pin-badge">
            <Icon name="pin" :size="12" />
          </span>
        </div>
        <span v-if="props.conversation.lastMessageTime" class="conversation-item__time">
          {{ new Date(props.conversation.lastMessageTime).toLocaleTimeString() }}
        </span>
      </div>
      <div class="conversation-item__bottom">
        <span class="conversation-item__message">{{ props.conversation.lastMessage }}</span>
        <Badge v-if="props.conversation.unreadCount" :count="props.conversation.unreadCount" />
      </div>
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

.conversation-item__pin-badge {
  display: inline-flex;
  align-items: center;
  color: var(--uikit-primary, #3b82f6);
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
