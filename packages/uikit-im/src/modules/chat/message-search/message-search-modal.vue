<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useMessageSearch } from '../../../composables/use-message-search'
import type { MessageSearchTypeFilter } from '../../../composables/use-message-search'
import { MESSAGE_TYPE } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useUIKit } from '../../../composables/use-uikit'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmInput as Input } from '@easemob/uikit-core'
import { EmEmpty as Empty } from '@easemob/uikit-core'
import { EmPopup as Popup } from '@easemob/uikit-core'

export interface MessageSearchModalProps {
  /** 弹窗显隐（v-model:show 受控） */
  show?: boolean
  config?: {
    /** 是否启用 SDK 服务端消息搜索 */
    enableServerSearch?: boolean
    /** 每页条数 */
    pageSize?: number
  }
}

export interface MessageSearchModalEmits {
  (e: 'update:show', value: boolean): void
  /** 点击搜索结果，payload 携带消息 ID 与所属会话 ID（全局搜索时可能跨会话） */
  (e: 'locate', payload: { msgId: string, conversationId: string }): void
  (e: 'close'): void
}

const props = defineProps<MessageSearchModalProps>()
const emit = defineEmits<MessageSearchModalEmits>()

const { t } = useLocale()
const { stores } = useUIKit()

const searchOptions = computed(() => ({
  enableServerSearch: props.config?.enableServerSearch ?? false,
  pageSize: props.config?.pageSize ?? 20,
}))

const {
  keyword,
  results,
  loading,
  scope,
  activeType,
  serverUnavailable,
  search,
  loadMore,
  reset,
} = useMessageSearch(searchOptions)

const inputRef = ref<InstanceType<typeof Input>>()

/** 全部会话 tab 仅服务端搜索可用（本地只加载了当前会话消息） */
const showScopeTabs = computed(() => props.config?.enableServerSearch === true)

/** 类型筛选 tab（websdk2 不支持 audio/cmd，combine 会被 SDK 丢弃，均不提供） */
const typeTabs: { value: MessageSearchTypeFilter, labelKey: string, fallback: string }[] = [
  { value: '', labelKey: 'message.search.typeAll', fallback: '全部' },
  { value: MESSAGE_TYPE.TEXT, labelKey: 'message.search.typeText', fallback: '文本' },
  { value: MESSAGE_TYPE.IMAGE, labelKey: 'message.search.typeImage', fallback: '图片' },
  { value: MESSAGE_TYPE.VIDEO, labelKey: 'message.search.typeVideo', fallback: '视频' },
  { value: MESSAGE_TYPE.FILE, labelKey: 'message.search.typeFile', fallback: '文件' },
  { value: MESSAGE_TYPE.LOCATION, labelKey: 'message.search.typeLocation', fallback: '位置' },
]

/** 弹窗关闭后重置搜索状态 */
watch(() => props.show, (visible) => {
  if (!visible) {
    reset()
    return
  }
  nextTick(() => {
    inputRef.value?.$el?.querySelector('input')?.focus()
  })
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

/** 切换范围/类型立即重搜（仅复位置状态，不清关键词） */
function reSearch() {
  if (!keyword.value.trim())
    return
  search(false)
}

watch([scope, activeType], reSearch)

function selectScope(value: 'conversation' | 'global') {
  if (scope.value === value)
    return
  scope.value = value
}

function selectType(value: MessageSearchTypeFilter) {
  if (activeType.value === value)
    return
  activeType.value = value
}

function onResultClick(msgId: string, conversationId: string) {
  emit('locate', { msgId, conversationId })
  emit('update:show', false)
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

/** 全局范围结果展示所属会话名（群名/会话名兜底会话 ID） */
function getConversationName(conversationId: string): string {
  const cvs = stores.conversation.conversationList.find(c => c.id === conversationId)
  return cvs?.name || conversationId
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

/**
 * 生成摘要高亮片段（纯字符串拆分渲染，不用 v-html，防 XSS）：
 * - 服务端 highlight 片段内含 `<em>关键词</em>` 标记，解析 <em> 为命中段，其余标签一律转义剥离；
 * - 无 highlight（本地结果）时按当前关键词拆分 summary。
 */
function getSummarySegments(item: { summary: string, highlighted?: string[] }): { text: string, hit: boolean }[] {
  if (item.highlighted && item.highlighted.length > 0) {
    const segments: { text: string, hit: boolean }[] = []
    item.highlighted.forEach((snippet, i) => {
      if (i > 0)
        segments.push({ text: ' … ', hit: false })
      // 按 <em>…</em> 切出命中段；非命中部分剥离其余 HTML 标签（转义显示，防 XSS）
      const re = /<em>([\s\S]*?)<\/em>/gi
      let cursor = 0
      for (;;) {
        const m = re.exec(snippet)
        if (!m)
          break
        const plain = snippet.slice(cursor, m.index).replace(/<[^>]*>/g, '')
        if (plain)
          segments.push({ text: plain, hit: false })
        const hitText = m[1].replace(/<[^>]*>/g, '')
        if (hitText)
          segments.push({ text: hitText, hit: true })
        cursor = m.index + m[0].length
      }
      const rest = snippet.slice(cursor).replace(/<[^>]*>/g, '')
      if (rest)
        segments.push({ text: rest, hit: false })
    })
    return segments.length > 0 ? segments : [{ text: item.summary || '', hit: false }]
  }

  const display = item.summary || ''
  const k = keyword.value.trim()
  if (!display || !k)
    return [{ text: display, hit: false }]
  const lower = display.toLowerCase()
  const kw = k.toLowerCase()
  const segments: { text: string, hit: boolean }[] = []
  let cursor = 0
  for (;;) {
    const idx = lower.indexOf(kw, cursor)
    if (idx === -1)
      break
    if (idx > cursor)
      segments.push({ text: display.slice(cursor, idx), hit: false })
    segments.push({ text: display.slice(idx, idx + kw.length), hit: true })
    cursor = idx + kw.length
  }
  if (cursor < display.length)
    segments.push({ text: display.slice(cursor), hit: false })
  return segments.length > 0 ? segments : [{ text: display, hit: false }]
}
</script>

<template>
  <Popup
    :show="props.show"
    position="center"
    :show-close="true"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="emit('close')"
  >
    <div class="message-search-modal">
      <!-- 标题栏 -->
      <div class="message-search-modal__header">
        <span class="message-search-modal__title">{{ t('message.search.title', '搜索消息') }}</span>
      </div>

      <!-- 搜索输入 -->
      <div class="message-search-modal__input">
        <Input
          ref="inputRef"
          v-model="keyword"
          variant="search"
          clearable
          clear-icon="search/xmark"
          :placeholder="t('message.search.placeholder', '搜索关键词...')"
        />
      </div>

      <!-- 筛选区：作用域（仅服务端搜索可用） + 消息类型 -->
      <div v-if="showScopeTabs" class="message-search-modal__scopes">
        <button
          class="message-search-modal__scope"
          :class="{ 'message-search-modal__scope--active': scope === 'conversation' }"
          @click="selectScope('conversation')"
        >
          {{ t('message.search.scopeConversation', '当前会话') }}
        </button>
        <button
          class="message-search-modal__scope"
          :class="{ 'message-search-modal__scope--active': scope === 'global' }"
          @click="selectScope('global')"
        >
          {{ t('message.search.scopeGlobal', '全部会话') }}
        </button>
      </div>
      <div class="message-search-modal__types">
        <button
          v-for="tab in typeTabs"
          :key="tab.value"
          class="message-search-modal__type"
          :class="{ 'message-search-modal__type--active': activeType === tab.value }"
          @click="selectType(tab.value)"
        >
          {{ t(tab.labelKey, tab.fallback) }}
        </button>
      </div>

      <!-- 服务端搜索降级提示 -->
      <div v-if="serverUnavailable" class="message-search-modal__notice">
        {{ t('message.search.serverUnavailable', '服务端搜索未开通，仅展示本地结果') }}
      </div>

      <!-- 结果列表 -->
      <div class="message-search-modal__results" @scroll="onScroll">
        <template v-if="results.length > 0">
          <div
            v-for="item in results"
            :key="item.msgId"
            class="message-search-modal__item"
            @click="onResultClick(item.msgId, item.conversationId)"
          >
            <Avatar :src="item.avatar" :name="item.senderName" :size="36" />
            <div class="message-search-modal__content">
              <div class="message-search-modal__meta">
                <span class="message-search-modal__name">{{ item.senderName }}</span>
                <span v-if="scope === 'global'" class="message-search-modal__cvs">
                  {{ getConversationName(item.conversationId) }}
                </span>
                <span class="message-search-modal__time">{{ formatTime(item.timestamp) }}</span>
              </div>
              <div class="message-search-modal__summary">
                <template v-for="(seg, idx) in getSummarySegments(item)" :key="idx">
                  <mark v-if="seg.hit" class="message-search-modal__mark">{{ seg.text }}</mark>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </div>
            </div>
          </div>
        </template>

        <div v-else-if="loading" class="message-search-modal__loading">
          <Icon name="loading/arc/big" :size="20" anim="spin" />
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
  </Popup>
</template>

<style scoped>
.message-search-modal {
  display: flex;
  flex-direction: column;
  width: 480px;
  max-width: 92vw;
  max-height: 70vh;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
}

.message-search-modal__header {
  display: flex;
  align-items: center;
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.message-search-modal__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.message-search-modal__input {
  padding: 4px 20px 12px;
  flex-shrink: 0;
}

.message-search-modal__scopes {
  display: flex;
  gap: 8px;
  padding: 0 20px 8px;
  flex-shrink: 0;
}

.message-search-modal__scope {
  padding: 4px 12px;
  border: none;
  border-radius: 14px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-12);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-search-modal__scope--active {
  background-color: var(--uikit-primary-color);
  color: var(--uikit-text-inverse);
}

.message-search-modal__types {
  display: flex;
  gap: 4px;
  padding: 0 20px 8px;
  border-bottom: 1px solid var(--uikit-border-color);
  flex-shrink: 0;
  overflow-x: auto;
}

.message-search-modal__type {
  padding: 4px 10px 8px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing),
    border-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-search-modal__type--active {
  color: var(--uikit-primary-color);
  border-bottom-color: var(--uikit-primary-color);
  font-weight: 500;
}

.message-search-modal__notice {
  padding: 8px 20px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  background-color: var(--uikit-bg-secondary);
  flex-shrink: 0;
}

.message-search-modal__results {
  flex: 1;
  min-height: 160px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 12px;
}

.message-search-modal__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: var(--uikit-components-radius, 8px);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .message-search-modal__item:hover {
    background-color: var(--uikit-bg-hover);
  }
}

.message-search-modal__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-search-modal__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-search-modal__name {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-search-modal__cvs {
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-search-modal__time {
  margin-left: auto;
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.message-search-modal__summary {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-search-modal__mark {
  background: transparent;
  color: var(--uikit-primary-color);
  font-weight: 500;
}

.message-search-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-13);
}
</style>
