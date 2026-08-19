<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../../locale'
import IconButton from '../icon-button/icon-button.vue'
import type { EmojiStickerItem, EmojiStickerPack } from './types'

export interface EmojiPickerProps {
  /** 是否显示面板，内部按 v-if 渲染；关闭时通过 update:show 通知父组件 / Whether to show the picker */
  show: boolean
  /** 表情包（sticker pack）列表，默认 [] 不展示表情包 tab / Sticker packs to show as extra tabs */
  stickerPacks?: EmojiStickerPack[]
  /** 选择 emoji / sticker 后自动关闭，默认 false */
  closeOnSelect?: boolean
}

const props = withDefaults(defineProps<EmojiPickerProps>(), {
  stickerPacks: () => [],
  closeOnSelect: false,
})

const emit = defineEmits<{
  /** 面板显隐状态变化时触发（关闭携带 false），用于 v-model:show 同步 / Emitted when visibility changes */
  (e: 'update:show', value: boolean): void
  /** 点击 emoji 时触发，负载为选中的 emoji 字符 / Emitted when an emoji is picked */
  (e: 'select', emoji: string): void
  /** 点击表情包中的 sticker 时触发，负载为 sticker 项与其所属 pack 的 id / Emitted when a sticker is picked */
  (e: 'select-sticker', sticker: EmojiStickerItem, packId: string): void
}>()

/** 常用 Emoji 列表 */
const emojiGroups = [
  {
    name: t('emoji.recent', '常用'),
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
]

/** 内置 emoji 组数量，tab 索引 >= 该值时为表情包 tab */
const emojiGroupCount = emojiGroups.length

/** tab 列表：内置 emoji 组 + 表情包（pack 优先展示 iconUrl 小图） */
const tabItems = computed(() => [
  ...emojiGroups.map(group => ({ key: `emoji-${group.name}`, name: group.name, iconUrl: undefined as string | undefined })),
  ...props.stickerPacks.map(pack => ({ key: `sticker-${pack.id}`, name: pack.name, iconUrl: pack.iconUrl })),
])

const activeTab = ref(0)

/** 当前 tab 的 emoji 列表（表情包 tab 时为空） */
const activeEmojis = computed(() =>
  activeTab.value < emojiGroupCount ? (emojiGroups[activeTab.value]?.emojis ?? []) : [],
)

/** 当前 tab 的表情包（emoji tab 时为 undefined） */
const activeStickerPack = computed(() =>
  activeTab.value >= emojiGroupCount ? props.stickerPacks[activeTab.value - emojiGroupCount] : undefined,
)

function onSelect(emoji: string) {
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
  <div v-if="props.show" class="emoji-picker">
    <div class="emoji-picker__header">
      <div class="emoji-picker__tabs">
        <div
          v-for="(tab, index) in tabItems"
          :key="tab.key"
          class="emoji-picker__tab"
          :class="{ 'emoji-picker__tab--active': activeTab === index }"
          @click="activeTab = index"
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
        </div>
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
    <div class="emoji-picker__body">
      <template v-if="activeStickerPack">
        <button
          v-for="sticker in activeStickerPack.stickers"
          :key="sticker.key"
          class="emoji-picker__item emoji-picker__item--sticker"
          :title="sticker.name"
          @click="onSelectSticker(sticker, activeStickerPack.id)"
        >
          <img
            class="emoji-picker__sticker-img"
            :src="sticker.thumbUrl || sticker.url"
            :alt="sticker.name || ''"
            loading="lazy"
          >
        </button>
      </template>
      <template v-else>
        <button
          v-for="emoji in activeEmojis"
          :key="emoji"
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
  width: 320px;
  max-width: calc(100vw - 24px);
}

.emoji-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--uikit-border-light);
}

.emoji-picker__tabs {
  display: flex;
  gap: 12px;
}

.emoji-picker__tab {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--uikit-components-radius);
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  display: flex;
  align-items: center;
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
  padding: 8px;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
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
</style>
