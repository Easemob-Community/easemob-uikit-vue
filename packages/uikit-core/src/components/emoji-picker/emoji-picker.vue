<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue'
import { t } from '../../locale'
import IconButton from '../icon-button/icon-button.vue'
import { useUIKitStorage } from '../../composables/use-uikit-storage'
import { EMOJI_ALL } from './emojis'
import type { EmojiStickerItem, EmojiStickerPack, EmojiTabsPosition } from './types'

export interface EmojiPickerProps {
  /** 是否显示面板，内部按 v-if 渲染；关闭时通过 update:show 通知父组件 / Whether to show the picker */
  show: boolean
  /** 表情包（sticker pack）列表，默认 [] 不展示表情包 tab / Sticker packs to show as extra tabs */
  stickerPacks?: EmojiStickerPack[]
  /** 选择 emoji / sticker 后自动关闭，默认 false */
  closeOnSelect?: boolean
  /** 是否启用「常用」最近使用 tab，默认 true；关闭后不展示常用 tab 也不再记录 / Whether to enable the recent-emoji tab, default true */
  recent?: boolean
  /** 常用列表长度（保留最近使用个数），默认 5 / Number of recently-used emojis kept, default 5 */
  recentCount?: number
  /** tab 位置：顶部/底部/左侧/右侧，默认 'top' / Tabs position: top/bottom/left/right, default 'top' */
  tabsPosition?: EmojiTabsPosition
  /** sticker 悬停时切换展示 gif（需提供 thumbUrl 预览图），默认 true / Swap to the gif on hover when thumbUrl is present, default true */
  stickerHover?: boolean
}

const props = withDefaults(defineProps<EmojiPickerProps>(), {
  stickerPacks: () => [],
  closeOnSelect: false,
  recent: true,
  recentCount: 5,
  tabsPosition: 'top',
  stickerHover: true,
})

const emit = defineEmits<{
  /** 面板显隐状态变化时触发（关闭携带 false），用于 v-model:show 同步 / Emitted when visibility changes */
  (e: 'update:show', value: boolean): void
  /** 点击 emoji 时触发，负载为选中的 emoji 字符 / Emitted when an emoji is picked */
  (e: 'select', emoji: string): void
  /** 点击表情包中的 sticker 时触发，负载为 sticker 项与其所属 pack 的 id / Emitted when a sticker is picked */
  (e: 'select-sticker', sticker: EmojiStickerItem, packId: string): void
}>()

/**
 * 最近使用列表：优先 localStorage（key 按 appKey + userId 隔离，见 useUIKitStorage），
 * 组件独立使用（无 <UIKitProvider>，如 story）时降级为内存，不持久化。
 * / Recent emojis: persisted to localStorage scoped by appKey + userId via useUIKitStorage;
 * falls back to in-memory when used without <UIKitProvider> (e.g. in stories).
 */
let recentList: Ref<string[]>
try {
  recentList = useUIKitStorage<string[]>('recentEmojis', [])
}
catch {
  recentList = ref<string[]>([])
}

/** 常用列表长度，钳制到 >= 1 */
const recentLimit = computed(() => Math.max(1, Math.floor(props.recentCount)))

/** 是否具备 hover 能力（触屏等无 hover 设备不启用预览图 → gif 切换） */
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

interface TabItem {
  key: string
  name: string
  iconUrl?: string
}

/** tab 列表：常用（可开关）→ Emoji 完整列表 → 注入的表情包 */
const tabItems = computed<TabItem[]>(() => {
  const tabs: TabItem[] = []
  if (props.recent)
    tabs.push({ key: 'recent', name: t('emoji.recent', '常用') })
  tabs.push({ key: 'emoji', name: t('emoji.full', '表情') })
  for (const pack of props.stickerPacks)
    tabs.push({ key: `sticker-${pack.id}`, name: pack.name, iconUrl: pack.iconUrl })
  return tabs
})

/** 默认打开的 tab：常用有内容时优先常用，否则落到 Emoji 完整列表；绝不自动选中注入的 sticker tab */
function defaultTabIndex(): number {
  const tabs = tabItems.value
  if (props.recent && recentList.value.length > 0) {
    const recentIdx = tabs.findIndex(tab => tab.key === 'recent')
    if (recentIdx >= 0)
      return recentIdx
  }
  const emojiIdx = tabs.findIndex(tab => tab.key === 'emoji')
  return emojiIdx >= 0 ? emojiIdx : 0
}

const activeTab = ref(defaultTabIndex())

/** 每次打开面板回到默认 tab（常用有内容 → 常用；否则 Emoji），不自动选中注入的 sticker tab */
watch(() => props.show, (v) => {
  if (v)
    activeTab.value = defaultTabIndex()
})

/** tab 列表变化（常用开关/注入包增减）时钳制越界索引 */
watch(tabItems, (tabs) => {
  if (activeTab.value >= tabs.length)
    activeTab.value = Math.max(0, tabs.length - 1)
})

const activeTabItem = computed(() => tabItems.value[activeTab.value])
const isRecentTab = computed(() => activeTabItem.value?.key === 'recent')
const isEmojiTab = computed(() => activeTabItem.value?.key === 'emoji')

/** 当前 tab 的 emoji 列表（表情包 tab 时为空） */
const activeEmojis = computed(() => {
  if (isRecentTab.value)
    return recentList.value
  if (isEmojiTab.value)
    return EMOJI_ALL
  return []
})

/** 当前 tab 的表情包（非 sticker tab 时为 undefined） */
const activeStickerPack = computed(() => {
  const item = activeTabItem.value
  if (!item || !item.key.startsWith('sticker-'))
    return undefined
  const packId = item.key.slice('sticker-'.length)
  return props.stickerPacks.find(pack => pack.id === packId)
})

/** 当前 hover 的 sticker key（预览图 → gif 切换用） */
const hoveredStickerKey = ref('')

function onTabClick(index: number) {
  activeTab.value = index
  hoveredStickerKey.value = ''
}

/** sticker 展示图：hover 且启用时切 gif，否则预览图（无预览图则直接展示 gif） */
function stickerSrc(sticker: EmojiStickerItem): string {
  if (props.stickerHover && canHover && hoveredStickerKey.value === sticker.key)
    return sticker.url
  return sticker.thumbUrl || sticker.url
}

function onStickerEnter(sticker: EmojiStickerItem) {
  if (props.stickerHover && canHover)
    hoveredStickerKey.value = sticker.key
}

function onStickerLeave() {
  hoveredStickerKey.value = ''
}

/** 记录最近使用：去重后前插，截断到 recentCount */
function recordRecent(emoji: string) {
  if (!props.recent)
    return
  const list = recentList.value.filter(e => e !== emoji)
  list.unshift(emoji)
  recentList.value = list.slice(0, recentLimit.value)
}

function onSelect(emoji: string) {
  recordRecent(emoji)
  emit('select', emoji)
  if (props.closeOnSelect)
    onClose()
}

function onSelectSticker(sticker: EmojiStickerItem, packId: string) {
  emit('select-sticker', sticker, packId)
  if (props.closeOnSelect)
    onClose()
}

function onClose() {
  emit('update:show', false)
}
</script>

<template>
  <div
    v-if="props.show"
    class="emoji-picker"
    :class="`emoji-picker--tabs-${props.tabsPosition}`"
  >
    <div class="emoji-picker__tabs-bar">
      <div class="emoji-picker__tabs" role="tablist">
        <button
          v-for="(tab, index) in tabItems"
          :key="tab.key"
          type="button"
          role="tab"
          class="emoji-picker__tab"
          :class="{ 'emoji-picker__tab--active': activeTab === index }"
          :aria-selected="activeTab === index"
          @click="onTabClick(index)"
        >
          <img
            v-if="tab.iconUrl"
            class="emoji-picker__tab-icon"
            :src="tab.iconUrl"
            :alt="tab.name"
          >
          <template v-else>
            {{ tab.name }}
          </template>
        </button>
      </div>
      <IconButton
        class="emoji-picker__close"
        icon="xmark/light"
        size="small"
        variant="ghost"
        :title="t('button.close', '关闭')"
        @click="onClose"
      />
    </div>

    <div class="emoji-picker__body" role="tabpanel">
      <template v-if="activeStickerPack">
        <button
          v-for="sticker in activeStickerPack.stickers"
          :key="sticker.key"
          type="button"
          class="emoji-picker__item emoji-picker__item--sticker"
          :title="sticker.name"
          @mouseenter="onStickerEnter(sticker)"
          @mouseleave="onStickerLeave"
          @click="onSelectSticker(sticker, activeStickerPack.id)"
        >
          <img
            class="emoji-picker__sticker-img"
            :src="stickerSrc(sticker)"
            :alt="sticker.name || ''"
            loading="lazy"
          >
        </button>
      </template>
      <template v-else-if="isRecentTab && activeEmojis.length === 0">
        <div class="emoji-picker__empty">
          {{ t('emoji.recentEmpty', '暂无常用表情') }}
        </div>
      </template>
      <template v-else>
        <button
          v-for="emoji in activeEmojis"
          :key="emoji"
          type="button"
          class="emoji-picker__item"
          @click="onSelect(emoji)"
        >
          {{ emoji }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker {
  display: flex;
  width: 320px;
  max-width: calc(100vw - 24px);
}

/* 四向布局：flex 方向控制 tabs 栏与 body 的相对位置 */
.emoji-picker--tabs-top {
  flex-direction: column;
}

.emoji-picker--tabs-bottom {
  flex-direction: column-reverse;
}

.emoji-picker--tabs-left {
  flex-direction: row;
}

.emoji-picker--tabs-right {
  flex-direction: row-reverse;
}

/* tabs 栏：默认横条（top/bottom） */
.emoji-picker__tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  flex-shrink: 0;
}

.emoji-picker--tabs-top .emoji-picker__tabs-bar {
  border-bottom: 1px solid var(--uikit-border-light);
}

.emoji-picker--tabs-bottom .emoji-picker__tabs-bar {
  border-top: 1px solid var(--uikit-border-light);
}

/* 竖排（left/right）：tabs 栏变为侧栏 */
.emoji-picker--tabs-left .emoji-picker__tabs-bar,
.emoji-picker--tabs-right .emoji-picker__tabs-bar {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-picker--tabs-left .emoji-picker__tabs-bar {
  border-right: 1px solid var(--uikit-border-light);
}

.emoji-picker--tabs-right .emoji-picker__tabs-bar {
  border-left: 1px solid var(--uikit-border-light);
}

.emoji-picker--tabs-left .emoji-picker__close,
.emoji-picker--tabs-right .emoji-picker__close {
  margin-top: auto;
  align-self: center;
}

.emoji-picker__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.emoji-picker--tabs-left .emoji-picker__tabs,
.emoji-picker--tabs-right .emoji-picker__tabs {
  flex-direction: column;
  align-items: stretch;
}

.emoji-picker__tab {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border: none;
  background: none;
  border-radius: var(--uikit-components-radius);
  white-space: nowrap;
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.emoji-picker--tabs-left .emoji-picker__tab,
.emoji-picker--tabs-right .emoji-picker__tab {
  justify-content: center;
}

@media (hover: hover) {
  .emoji-picker__tab:hover {
    color: var(--uikit-text-primary);
  }
}

.emoji-picker__tab--active {
  color: var(--uikit-primary-color);
  background-color: var(--uikit-bg-secondary);
  font-weight: 500;
}

.emoji-picker__tab-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
}

.emoji-picker__close {
  flex-shrink: 0;
}

.emoji-picker__body {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 4px;
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
  flex: 1;
  min-width: 0;
}

.emoji-picker__item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--uikit-font-size-20);
  background: none;
  border: none;
  border-radius: var(--uikit-components-radius);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .emoji-picker__item:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

.emoji-picker__item--sticker {
  width: 56px;
  height: 56px;
  padding: 4px;
}

.emoji-picker__sticker-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.emoji-picker__empty {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 8px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-tertiary);
}
</style>
