<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import Cell from '../../../components/cell/cell.vue'
import IconButton from '../../../components/icon-button/icon-button.vue'
import { useChat } from '../../../composables/use-chat'
import { useUIKit } from '../../../composables/use-uikit'
import { useLocale } from '../../../locale'
import type { UiMessage } from '../../../sdk/types'
import PinnedBarItem from './pinned-bar-item.vue'

export interface PinnedBarProps {
  /** 预览文本最大长度 */
  maxPreviewLength?: number
}

export interface PinnedBarEmits {
  (e: 'locate', message: UiMessage): void
  (e: 'unpin', message: UiMessage): void
}

const props = withDefaults(defineProps<PinnedBarProps>(), {
  maxPreviewLength: 30,
})
const emit = defineEmits<PinnedBarEmits>()

const { stores } = useUIKit()
const { currentConversation, unpinMessage } = useChat()
const { t } = useLocale()

/** 当前会话的置顶消息列表（按 pinTime 降序） */
const pinnedList = computed<UiMessage[]>(() => {
  const cvsId = currentConversation.value?.id
  if (!cvsId)
    return []
  return stores.message.getPinnedMessages(cvsId) || []
})

/** 是否展开列表 */
const expanded = ref(false)

/** 当前轮播位置（折叠态） */
const cursor = ref(0)

const currentItem = computed(() => pinnedList.value[cursor.value] || pinnedList.value[0])

function onLocate(msg: UiMessage) {
  emit('locate', msg)
}

async function onUnpin(msg: UiMessage, evt?: Event) {
  evt?.stopPropagation()
  try {
    await unpinMessage(msg)
    emit('unpin', msg)
    if (cursor.value >= pinnedList.value.length)
      cursor.value = 0
  }
  catch {
    // 错误已在 useChat 内 console.warn
  }
}

function toggle() {
  if (pinnedList.value.length <= 1)
    return
  expanded.value = !expanded.value
}
</script>

<template>
  <div v-if="pinnedList.length > 0" class="pinned-bar">
    <!-- 折叠态：仅展示当前一条 -->
    <div
      v-if="!expanded"
      class="pinned-bar__row"
      @click="currentItem && onLocate(currentItem)"
    >
      <Icon class="pinned-bar__icon" name="chat/pin" :size="14" />
      <div class="pinned-bar__content">
        <PinnedBarItem
          v-if="currentItem"
          :message="currentItem"
          :max-preview-length="props.maxPreviewLength"
        />
      </div>
      <span
        v-if="pinnedList.length > 1"
        class="pinned-bar__count"
        @click.stop="toggle"
      >
        {{ t('chat.pinnedBar.count').replace('{count}', String(pinnedList.length)) }}
      </span>
      <IconButton
        v-if="currentItem"
        class="pinned-bar__action"
        icon="actions/close"
        size="small"
        variant="ghost"
        :title="t('message.action.unpin')"
        @click="onUnpin(currentItem, $event)"
      />
    </div>

    <!-- 展开态：滚动列表 -->
    <div v-else class="pinned-bar__list">
      <div class="pinned-bar__list-header" @click="toggle">
        <Icon class="pinned-bar__icon" name="chat/pin" :size="14" />
        <span>{{ t('chat.pinnedBar.count').replace('{count}', String(pinnedList.length)) }}</span>
        <Icon name="arrows/arrow_up_thick" :size="12" />
      </div>
      <Cell
        v-for="msg in pinnedList"
        :key="msg.msgServerId || msg.msgLocalId"
        class="pinned-bar__item"
        auto-height
        border="bottom"
        @click="onLocate(msg)"
      >
        <template #default>
          <div class="pinned-bar__content">
            <PinnedBarItem :message="msg" :max-preview-length="props.maxPreviewLength" />
          </div>
        </template>
        <template #trailing>
          <IconButton
            class="pinned-bar__action"
            icon="actions/close"
            size="small"
            variant="ghost"
            :title="t('message.action.unpin')"
            @click="onUnpin(msg, $event)"
          />
        </template>
      </Cell>
    </div>
  </div>
</template>

<style scoped>
.pinned-bar {
  position: relative;
  z-index: 5;
  background-color: var(--uikit-bg-base);
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  font-size: 13px;
  color: var(--uikit-text-primary);
}

.pinned-bar__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.pinned-bar__row:hover {
  background-color: var(--uikit-bg-secondary);
}

.pinned-bar__icon {
  flex-shrink: 0;
  color: var(--uikit-primary-color, #5f6df3);
}

.pinned-bar__content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pinned-bar__sender {
  flex-shrink: 0;
  font-weight: 500;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pinned-bar__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-bar__count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  padding: 0 4px;
}

.pinned-bar__count:hover {
  color: var(--uikit-primary-color, #5f6df3);
}

.pinned-bar__action {
  flex-shrink: 0;
}

.pinned-bar__list {
  max-height: 240px;
  overflow-y: auto;
}

.pinned-bar__list-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
  background-color: var(--uikit-bg-base);
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  cursor: pointer;
}

.pinned-bar__item {
  --uikit-item-hover-padding-x: 12px;
}
</style>
