<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { EmIcon as Icon, useLocale } from '@easemob/uikit-core'
import { DEFAULT_CONVERSATION_TABS } from './types'
import type { ConversationTabKey, ConversationTabsSlotScope } from './types'

const props = withDefaults(defineProps<ConversationTabsProps>(), {
  tabs: () => [...DEFAULT_CONVERSATION_TABS],
  activeTab: 'all',
})

const emit = defineEmits<{
  (e: 'update:active-tab', tab: ConversationTabKey): void
}>()

const { t } = useLocale()

/** 分栏 tab 文案映射（走 i18n，computed 保证语言切换后刷新） */
const tabLabels = computed<Record<ConversationTabKey, string>>(() => ({
  all: t('conversation.tabAll'),
  unread: t('conversation.tabUnread'),
  atMe: t('conversation.tabAtMe'),
  single: t('conversation.tabSingle'),
  group: t('conversation.tabGroup'),
}))

export interface ConversationTabsProps {
  /**
   * 会话分栏 tab 集合，默认全量 ['all', 'unread', 'atMe', 'single', 'group']；
   * 顺序即渲染优先级；传空数组可隐藏 tab 栏。
   */
  tabs?: ConversationTabKey[]
  /** 当前激活的分栏 tab（v-model:active-tab），默认 'all' */
  activeTab?: ConversationTabKey
}

/** 切换分栏 tab */
function selectTab(tab: ConversationTabKey) {
  if (tab === props.activeTab)
    return
  emit('update:active-tab', tab)
}

/** 默认插槽（完全接管）作用域：computed 保证 props 变化时插槽拿到最新值 */
const slotScope = computed<ConversationTabsSlotScope>(() => ({
  tabs: props.tabs,
  activeTab: props.activeTab,
  selectTab,
}))

/* ===== 横向溢出与翻页箭头 ===== */
const scrollerRef = ref<HTMLElement>()
/** 内容是否溢出（溢出时展示左右翻页箭头） */
const scrollable = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

/** 同步溢出/可达边界状态（1px 容差抵消缩放抖动） */
function updateScrollState() {
  const el = scrollerRef.value
  if (!el)
    return
  scrollable.value = el.scrollWidth > el.clientWidth + 1
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

useResizeObserver(scrollerRef, updateScrollState)
watch(() => props.tabs, async () => {
  await nextTick()
  updateScrollState()
})

/** 点击箭头按可视宽度的 60% 翻页滚动 */
function scrollTabs(direction: 'left' | 'right') {
  const el = scrollerRef.value
  if (!el)
    return
  const step = Math.max(el.clientWidth * 0.6, 80)
  el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' })
}
</script>

<template>
  <!-- 分栏 tab：横向胶囊，溢出时右侧展示左右翻页箭头；tabs 为空数组时隐藏。
       传入默认插槽时完全接管渲染，插槽作用域提供 tabs / activeTab / selectTab -->
  <div v-if="props.tabs?.length" class="conversation-tabs">
    <div ref="scrollerRef" class="conversation-tabs__scroller" @scroll.passive="updateScrollState">
      <slot v-bind="slotScope">
        <button
          v-for="tab in props.tabs"
          :key="tab"
          type="button"
          class="conversation-tabs__tab"
          :class="{ 'is-active': props.activeTab === tab }"
          @click="selectTab(tab)"
        >
          {{ tabLabels[tab] }}
        </button>
      </slot>
    </div>
    <div v-if="scrollable" class="conversation-tabs__ctl">
      <button
        type="button"
        class="conversation-tabs__arrow"
        :disabled="!canScrollLeft"
        :aria-label="t('conversation.tabScrollPrev')"
        @click="scrollTabs('left')"
      >
        <Icon name="chevron/left" :size="12" />
      </button>
      <button
        type="button"
        class="conversation-tabs__arrow"
        :disabled="!canScrollRight"
        :aria-label="t('conversation.tabScrollNext')"
        @click="scrollTabs('right')"
      >
        <Icon name="chevron/right" :size="12" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 分栏 tab 栏：左为胶囊滚动区，右为翻页箭头（溢出时出现） */
.conversation-tabs {
  display: flex;
  align-items: center;
  gap: var(--uikit-spacing-2, 8px);
  padding: var(--uikit-spacing-3, 12px) var(--uikit-spacing-3, 12px) var(--uikit-spacing-2, 8px);
}

/* 胶囊滚动区：隐藏滚动条，翻页走右侧箭头（触屏直接滑动） */
.conversation-tabs__scroller {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  gap: var(--uikit-spacing-2, 8px);
  overflow-x: auto;
  scrollbar-width: none;
}

.conversation-tabs__scroller::-webkit-scrollbar {
  display: none;
}

/* 接管插槽内容作为滚动区唯一直接子节点时，允许其按内容宽度撑出滚动 */
.conversation-tabs__scroller > * {
  flex: 0 0 auto;
}

.conversation-tabs__tab {
  flex: 0 0 auto;
  padding: 4px 12px;
  font-size: var(--uikit-font-size-14, 14px);
  line-height: 18px;
  white-space: nowrap;
  color: var(--uikit-text-primary);
  background-color: var(--uikit-bg-secondary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease),
    color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
  .conversation-tabs__tab:hover {
    background-color: var(--uikit-bg-hover, #F5F5F5);
  }
}

/* 激活态：浅主色底 + 主色字（跟随主题色） */
.conversation-tabs__tab.is-active {
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-primary);
  background-color: var(--uikit-bg-active);
}

.conversation-tabs__tab:focus-visible {
  outline: 2px solid var(--uikit-primary);
  outline-offset: 1px;
}

/* 翻页箭头 */
.conversation-tabs__ctl {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.conversation-tabs__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: var(--uikit-text-secondary);
  background: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

@media (hover: hover) {
  .conversation-tabs__arrow:hover:not(:disabled) {
    background-color: var(--uikit-bg-hover, #F5F5F5);
  }
}

.conversation-tabs__arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

.conversation-tabs__arrow:focus-visible {
  outline: 2px solid var(--uikit-primary);
  outline-offset: 1px;
}
</style>
