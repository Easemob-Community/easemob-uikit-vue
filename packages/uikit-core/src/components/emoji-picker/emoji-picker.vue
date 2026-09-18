<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue'
import { t } from '../../locale'
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
  /** 是否启用「常用」最近使用区（置于表情视图顶部），默认 true；关闭后不展示常用区也不再记录 / Whether to enable the recent-emoji section at the top of the emoji view, default true */
  recent?: boolean
  /** 常用列表长度（保留最近使用个数），默认 5 / Number of recently-used emojis kept, default 5 */
  recentCount?: number
  /** tab 位置：顶部/底部/左侧/右侧，默认 'bottom' / Tabs position: top/bottom/left/right, default 'bottom' */
  tabsPosition?: EmojiTabsPosition
  /** sticker 悬停时切换展示 gif（需提供 thumbUrl 预览图），默认 true / Swap to the gif on hover when thumbUrl is present, default true */
  stickerHover?: boolean
  /** 「Emoji」视图 tab 预览小图 URL（可选，展示图片；不设时显示 😀 字形）/ Optional icon for the "Emoji" view tab, shown as an image instead of the default 😀 glyph */
  emojiIcon?: string
}

const props = withDefaults(defineProps<EmojiPickerProps>(), {
  stickerPacks: () => [],
  closeOnSelect: false,
  recent: true,
  recentCount: 5,
  tabsPosition: 'bottom',
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

/** tab 列表：「Emoji」综合视图（常用 + 完整列表合并）+ 注入的表情包；
 *  表情包 tab 尽量带一张预览小图：取 pack.iconUrl，缺省回落到包内第一个 sticker 的预览图；
 *  「Emoji」视图 tab 通过 emojiIcon 配置图片，未配置时显示 😀 字形 */
const tabItems = computed<TabItem[]>(() => {
  const tabs: TabItem[] = []
  tabs.push({ key: 'emoji', name: t('emoji.full', 'Emoji'), iconUrl: props.emojiIcon })
  for (const pack of props.stickerPacks) {
    const firstSticker = pack.stickers[0]
    tabs.push({
      key: `sticker-${pack.id}`,
      name: pack.name,
      iconUrl: pack.iconUrl || (firstSticker ? firstSticker.thumbUrl || firstSticker.url : undefined),
    })
  }
  return tabs
})

const activeTab = ref(0)

/** 每次打开面板回到「Emoji」综合视图，不自动选中注入的 sticker tab */
watch(() => props.show, (v) => {
  if (v)
    activeTab.value = 0
})

/** tab 列表变化（注入包增减）时钳制越界索引 */
watch(tabItems, (tabs) => {
  if (activeTab.value >= tabs.length)
    activeTab.value = Math.max(0, tabs.length - 1)
})

const activeTabItem = computed(() => tabItems.value[activeTab.value])

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
    <!-- 仅注入了表情包时才需要 tab 栏（单 Emoji 视图无切换意义） -->
    <div
      v-if="props.stickerPacks.length > 0"
      class="emoji-picker__tabs-bar"
      role="tablist"
    >
      <button
        v-for="(tab, index) in tabItems"
        :key="tab.key"
        type="button"
        role="tab"
        class="emoji-picker__tab"
        :class="{ 'emoji-picker__tab--active': activeTab === index }"
        :aria-selected="activeTab === index"
        :title="tab.name"
        @click="onTabClick(index)"
      >
        <img
          v-if="tab.iconUrl"
          class="emoji-picker__tab-icon"
          :src="tab.iconUrl"
          :alt="tab.name"
        >
        <span
          v-else-if="tab.key === 'emoji'"
          class="emoji-picker__tab-emoji"
          aria-hidden="true"
        >😀</span>
        <template v-else>
          {{ tab.name }}
        </template>
      </button>
    </div>

    <div class="emoji-picker__body" role="tabpanel">
      <!-- 表情包视图：4 列网格（minmax 弹性列宽，滚动条占位/宽屏下列数自适应），图 + 名称标签 -->
      <div
        v-if="activeStickerPack"
        class="emoji-picker__sticker-grid"
      >
        <button
          v-for="sticker in activeStickerPack.stickers"
          :key="sticker.key"
          type="button"
          class="emoji-picker__sticker"
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
          <span
            v-if="sticker.name"
            class="emoji-picker__sticker-name"
          >{{ sticker.name }}</span>
        </button>
      </div>

      <!-- 「Emoji」综合视图：常用（有内容才显示）+ 完整列表两个分区，单一滚动区 -->
      <template v-else>
        <section
          v-if="props.recent && recentList.length > 0"
          class="emoji-picker__section"
        >
          <div class="emoji-picker__section-title">
            {{ t('emoji.recent', '常用') }}
          </div>
          <div class="emoji-picker__emoji-grid">
            <button
              v-for="emoji in recentList"
              :key="`recent-${emoji}`"
              type="button"
              class="emoji-picker__item"
              @click="onSelect(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </section>

        <section class="emoji-picker__section">
          <div class="emoji-picker__section-title">
            {{ t('emoji.full', 'Emoji') }}
          </div>
          <div class="emoji-picker__emoji-grid">
            <button
              v-for="emoji in EMOJI_ALL"
              :key="emoji"
              type="button"
              class="emoji-picker__item"
              @click="onSelect(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </section>
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

/* tabs 栏：默认横条（top/bottom），40×40 图标 tab */
.emoji-picker__tabs-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  flex-shrink: 0;
}

.emoji-picker--tabs-top .emoji-picker__tabs-bar {
  border-bottom: 1px solid var(--uikit-border-color);
}

.emoji-picker--tabs-bottom .emoji-picker__tabs-bar {
  border-top: 1px solid var(--uikit-border-color);
}

/* 竖排（left/right）：tabs 栏变为侧栏 */
.emoji-picker--tabs-left .emoji-picker__tabs-bar,
.emoji-picker--tabs-right .emoji-picker__tabs-bar {
  flex-direction: column;
  align-items: stretch;
  padding: 8px 4px;
  max-height: 212px;
  overflow-y: auto;
}

.emoji-picker--tabs-left .emoji-picker__tabs-bar {
  border-right: 1px solid var(--uikit-border-color);
}

.emoji-picker--tabs-right .emoji-picker__tabs-bar {
  border-left: 1px solid var(--uikit-border-color);
}

.emoji-picker__tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  padding: 8px;
  border: none;
  background: none;
  border-radius: calc(var(--uikit-components-radius, 8px) - 2px);
  white-space: nowrap;
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .emoji-picker__tab:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

.emoji-picker__tab--active,
.emoji-picker__tab--active:hover {
  color: var(--uikit-primary-color);
  background-color: var(--uikit-bg-active);
}

.emoji-picker__tab-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
  border-radius: 4px;
}

/* Emoji tab 未配 emojiIcon 时的默认字形 */
.emoji-picker__tab-emoji {
  font-size: 24px;
  line-height: 24px;
  display: block;
}

.emoji-picker__body {
  position: relative;
  padding: 8px;
  /* 固定高度（对稿 212px）：tab 切换时面板尺寸不随内容多少伸缩，超出滚动；
     必须 flex:none——flex:1 的 flex-basis:0% 会覆盖 height，auto 高度容器里被内容撑开 */
  height: 212px;
  overflow-y: auto;
  flex: none;
  min-width: 0;
}

/* Emoji 综合视图：分区（label + 网格） */
.emoji-picker__section + .emoji-picker__section {
  margin-top: 8px;
}

.emoji-picker__section-title {
  padding: 0 4px;
  font-size: var(--uikit-font-size-9);
  font-weight: var(--uikit-font-weight-medium, 500);
  color: var(--uikit-text-tertiary);
  line-height: 1.4;
}

.emoji-picker__emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.emoji-picker__item {
  width: 32px;
  height: 32px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 28px;
  background: none;
  border: none;
  border-radius: calc(var(--uikit-components-radius, 8px) / 2);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .emoji-picker__item:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

/* 表情包视图：4 列网格（对稿 62px 项 + 12px 间距），图 + 名称。
   用 minmax(56px, 1fr) 弹性列而非固定 62px 列：经典（非悬浮）滚动条会吃掉 body 约 15px 宽度，
   固定列宽会退化成 3 列；弹性列在默认 320px 面板上稳定 4 列，宽屏（H5 全宽）auto-fill 自动加列 */
.emoji-picker__sticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 12px;
  padding: 8px;
}

.emoji-picker__sticker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 0;
  background: none;
  border: none;
  border-radius: calc(var(--uikit-components-radius, 8px) / 2);
  cursor: pointer;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .emoji-picker__sticker:hover {
    background-color: var(--uikit-bg-secondary);
  }
}

.emoji-picker__sticker-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  display: block;
}

.emoji-picker__sticker-name {
  width: 100%;
  font-size: var(--uikit-font-size-9);
  color: var(--uikit-text-secondary);
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
