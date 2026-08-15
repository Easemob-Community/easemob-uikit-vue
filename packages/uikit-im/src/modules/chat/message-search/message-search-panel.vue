<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useMessageSearch } from '../../../composables/use-message-search'
import { useLocale } from '../../../locale'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import IconButton from '../../../components/icon-button/icon-button.vue'
import Input from '../../../components/input/input.vue'
import Empty from '../../../components/empty/empty.vue'

export interface MessageSearchPanelProps {
  /** 面板显隐 */
  show?: boolean
  config?: {
    /** 是否启用 SDK 服务端消息搜索 */
    enableServerSearch?: boolean
    /** 每页条数 */
    pageSize?: number
  }
}

export interface MessageSearchPanelEmits {
  (e: 'locate', msgId: string): void
  (e: 'close'): void
}

const props = defineProps<MessageSearchPanelProps>()
const emit = defineEmits<MessageSearchPanelEmits>()

const { t } = useLocale()

const searchOptions = computed(() => ({
  enableServerSearch: props.config?.enableServerSearch ?? false,
  pageSize: props.config?.pageSize ?? 20,
}))

const { keyword, results, loading, search, loadMore, reset } = useMessageSearch(searchOptions)

const inputRef = ref<InstanceType<typeof Input>>()

/** 面板关闭后重置搜索状态 */
watch(() => props.show, (visible) => {
  if (!visible)
    reset()
})

/** 防抖触发搜索 */
const debouncedSearch = useDebounceFn(() => {
  search(false)
}, 300)

watch(keyword, () => {
  if (!keyword.value.trim()) {
    reset()
    return
  }
  debouncedSearch()
})

function onResultClick(msgId: string) {
  emit('locate', msgId)
  emit('close')
}

function onScroll(event: Event) {
  const el = event.target as HTMLElement
  if (!el)
    return
  const threshold = 20
  if (el.scrollHeight - el.scrollTop - el.clientHeight <= threshold) {
    loadMore()
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  if (isToday)
    return `${hours}:${minutes}`
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

nextTick(() => {
  inputRef.value?.$el?.querySelector('input')?.focus()
})
</script>

<template>
  <div class="message-search-panel">
    <div class="message-search-panel__header">
      <h4 class="message-search-panel__title">
        {{ t('message.search.title', '搜索消息') }}
      </h4>
      <IconButton
        class="message-search-panel__close"
        icon="actions/close"
        size="small"
        variant="ghost"
        :title="t('button.close', '关闭')"
        @click="emit('close')"
      />
    </div>

    <div class="message-search-panel__input">
      <Input
        ref="inputRef"
        v-model="keyword"
        variant="search"
        clearable
        clear-icon="misc/search_clear"
        :placeholder="t('message.search.placeholder', '搜索关键词...')"
      />
    </div>

    <div class="message-search-panel__results" @scroll="onScroll">
      <template v-if="results.length > 0">
        <div
          v-for="item in results"
          :key="item.msgId"
          class="message-search-panel__item"
          @click="onResultClick(item.msgId)"
        >
          <Avatar :src="item.avatar" :name="item.senderName" :size="36" />
          <div class="message-search-panel__content">
            <div class="message-search-panel__meta">
              <span class="message-search-panel__name">{{ item.senderName }}</span>
              <span class="message-search-panel__time">{{ formatTime(item.timestamp) }}</span>
            </div>
            <div class="message-search-panel__summary">
              {{ item.summary }}
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="loading" class="message-search-panel__loading">
        <Icon name="actions/loading_circle" :size="20" anim="spin" />
        <span>{{ t('message.search.loading', '搜索中...') }}</span>
      </div>

      <Empty
        v-else-if="keyword.trim()"
        icon="empty/search"
        :description="t('message.search.empty', '无搜索结果')"
        size="small"
      />
    </div>
  </div>
</template>

<style scoped>
.message-search-panel {
  display: flex;
  flex-direction: column;
  width: 360px;
  max-width: 90vw;
  max-height: 70vh;
  background-color: var(--uikit-bg-elevated, var(--uikit-bg-base));
}

.message-search-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color);
}

.message-search-panel__title {
  margin: 0;
  font-size: var(--uikit-font-size-15);
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.message-search-panel__close {
  flex-shrink: 0;
}

.message-search-panel__input {
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color);
}

.message-search-panel__results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.message-search-panel__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: var(--uikit-components-radius, 8px);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .message-search-panel__item:hover {
    background-color: var(--uikit-bg-hover);
  }
}

.message-search-panel__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-search-panel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.message-search-panel__name {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-primary);
  font-weight: 500;
}

.message-search-panel__time {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.message-search-panel__summary {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-search-panel__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
}
</style>
