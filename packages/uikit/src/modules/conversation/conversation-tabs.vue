<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../locale'
import { DEFAULT_CONVERSATION_TABS } from './types'
import type { ConversationTabKey, ConversationTabsSlotScope } from './types'

export interface ConversationTabsProps {
  /**
   * 会话分栏 tab 集合，默认全量 ['all', 'unread', 'atMe', 'single', 'group']；
   * 顺序即渲染优先级；传空数组可隐藏 tab 栏。
   */
  tabs?: ConversationTabKey[]
  /** 当前激活的分栏 tab（v-model:active-tab），默认 'all' */
  activeTab?: ConversationTabKey
}

const props = withDefaults(defineProps<ConversationTabsProps>(), {
  tabs: () => [...DEFAULT_CONVERSATION_TABS],
  activeTab: 'all',
})

const emit = defineEmits<{
  (e: 'update:active-tab', tab: ConversationTabKey): void
}>()

const { t } = useLocale()

/** 分栏 tab 文案映射（走 i18n） */
const tabLabels: Record<ConversationTabKey, string> = {
  all: t('conversation.tabAll'),
  unread: t('conversation.tabUnread'),
  atMe: t('conversation.tabAtMe'),
  single: t('conversation.tabSingle'),
  group: t('conversation.tabGroup'),
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
</script>

<template>
  <!-- 分栏 tab：横向胶囊，溢出时可横向滑动；tabs 为空数组时隐藏。
       传入默认插槽时完全接管渲染，插槽作用域提供 tabs / activeTab / selectTab -->
  <div v-if="props.tabs?.length" class="conversation-tabs">
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
</template>

<style scoped>
/* 分栏 tab：横向胶囊，窄屏可横向滑动 */
.conversation-tabs {
  display: flex;
  gap: 8px;
  padding: 2px 16px 6px;
  overflow-x: auto;
  /* 滚动条始终占位（默认透明），hover 时滑块显色提示可滑动；避免 hover 时布局闪动 */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

/* hover 时滑块显色（Firefox） */
.conversation-tabs:hover {
  scrollbar-color: var(--uikit-border-color, #e5e7eb) transparent;
}

/* 滚动条始终占位 4px，轨道透明（WebKit） */
.conversation-tabs::-webkit-scrollbar {
  display: block;
  height: 4px;
}

.conversation-tabs::-webkit-scrollbar-track {
  background: transparent;
}

/* 默认滑块透明，hover 显色 */
.conversation-tabs::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 2px;
}

.conversation-tabs:hover::-webkit-scrollbar-thumb {
  background-color: var(--uikit-border-color, #e5e7eb);
}

.conversation-tabs__tab {
  flex-shrink: 0;
  padding: 5px 14px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--uikit-text-secondary);
  background-color: var(--uikit-bg-secondary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease),
    color var(--uikit-anim-duration, 0.15s) var(--uikit-anim-easing, ease);
}

.conversation-tabs__tab:hover {
  background-color: var(--uikit-bg-hover, #f3f4f6);
}

.conversation-tabs__tab.is-active {
  color: #fff;
  background-color: var(--uikit-primary, #3b82f6);
}
</style>
