<script setup lang="ts">
import { ref } from 'vue'
import Button from '../button/button.vue'
import EmojiPicker from './emoji-picker.vue'
import type { EmojiStickerItem, EmojiStickerPack, EmojiTabsPosition } from './types'

const show = ref(true)
const selected = ref('')

function onSelect(emoji: string) {
  selected.value = emoji
}

// ===== 常用（最近使用）Variant =====

const showRecent = ref(true)
const recentInfo = ref('')

// ===== 表情包 Variant =====

/** 生成纯色 SVG 占位图（data URI，离线可用） */
function placeholder(color: string, text: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="16" fill="${color}"/><text x="48" y="58" font-size="28" text-anchor="middle" fill="#fff">${text}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** 构造「预览图 + 实际图」成对的 sticker：thumbUrl 为静态预览，url 为动图（这里用不同颜色占位模拟 gif） */
function makeSticker(key: string, thumbColor: string, gifColor: string, name: string): EmojiStickerItem {
  return { key, thumbUrl: placeholder(thumbColor, '预'), url: placeholder(gifColor, 'GIF'), name }
}

const stickerPacks: EmojiStickerPack[] = [
  {
    id: 'pack-cat',
    name: '猫猫',
    iconUrl: placeholder('#f59e0b', '猫'),
    stickers: [
      makeSticker('cat-1', '#f59e0b', '#dc2626', '喵'),
      makeSticker('cat-2', '#fbbf24', '#ea580c', '嗷'),
      makeSticker('cat-3', '#fcd34d', '#d97706', '呜'),
    ],
  },
  {
    id: 'pack-doge',
    name: '狗狗',
    stickers: [
      makeSticker('doge-1', '#10b981', '#059669', '汪'),
      makeSticker('doge-2', '#34d399', '#047857', '旺'),
    ],
  },
]

const showSticker = ref(true)
const selectedSticker = ref('')

function onSelectSticker(sticker: EmojiStickerItem, packId: string) {
  selectedSticker.value = `${packId} / ${sticker.name || sticker.key}`
}

// ===== tab 位置 Variant =====

const positions: EmojiTabsPosition[] = ['bottom', 'top', 'left', 'right']
const positionIndex = ref(0)
const tabsPosition = ref<EmojiTabsPosition>('bottom')
const showPosition = ref(true)

function cyclePosition() {
  positionIndex.value = (positionIndex.value + 1) % positions.length
  tabsPosition.value = positions[positionIndex.value]
}

// ===== tab 预览小图 + emoji 放大预览 Variant =====

const showTabIcons = ref(true)
const tabIconInfo = ref('')

function onTabIconSelect(emoji: string) {
  tabIconInfo.value = `已选择：${emoji}`
}
</script>

<template>
  <Story title="EmojiPicker">
    <Variant title="基础用法（常用 + Emoji 合并视图）">
      <div style="width: 340px;">
        <div class="u-flex u-gap-2 u-items-center" style="margin-bottom: 8px;">
          <Button size="small" @click="show = !show">
            {{ show ? '关闭' : '打开' }}表情
          </Button>
          <span v-if="selected" style="font-size: var(--uikit-font-size-13); color: var(--uikit-text-secondary);">
            已选择：{{ selected }}
          </span>
        </div>
        <EmojiPicker v-model:show="show" @select="onSelect" />
      </div>
    </Variant>

    <Variant title="常用（最近使用）联动">
      <div style="width: 340px;">
        <div class="u-flex u-gap-2 u-items-center" style="margin-bottom: 8px;">
          <Button size="small" @click="showRecent = !showRecent">
            {{ showRecent ? '关闭' : '打开' }}表情
          </Button>
          <span v-if="recentInfo" style="font-size: var(--uikit-font-size-13); color: var(--uikit-text-secondary);">
            {{ recentInfo }}
          </span>
        </div>
        <EmojiPicker
          v-model:show="showRecent"
          :recent="true"
          :recent-count="5"
          :emoji-preview="true"
          @select="recentInfo = `已选择：${$event}（已记录到「常用」区，保留最近 5 个）`"
        />
        <p style="font-size: var(--uikit-font-size-12); color: var(--uikit-text-tertiary); margin-top: 8px;">
          点选若干 emoji 后，「常用」区（视图顶部）会实时记录最近 5 个。
        </p>
      </div>
    </Variant>

    <Variant title="表情包（stickerPacks + hover 预览）">
      <div style="width: 340px;">
        <div class="u-flex u-gap-2 u-items-center" style="margin-bottom: 8px;">
          <Button size="small" @click="showSticker = !showSticker">
            {{ showSticker ? '关闭' : '打开' }}表情
          </Button>
          <span v-if="selectedSticker" style="font-size: var(--uikit-font-size-13); color: var(--uikit-text-secondary);">
            已选择表情包：{{ selectedSticker }}
          </span>
        </div>
        <EmojiPicker
          v-model:show="showSticker"
          :sticker-packs="stickerPacks"
          @select="onSelect"
          @select-sticker="onSelectSticker"
        />
        <p style="font-size: var(--uikit-font-size-12); color: var(--uikit-text-tertiary); margin-top: 8px;">
          底部 tab：表情视图（😀）+ 表情包。sticker 默认展示预览图（「预」），悬停切换动图（「GIF」），移出恢复。
        </p>
      </div>
    </Variant>

    <Variant title="tab 位置（tabsPosition）">
      <div style="width: 400px;">
        <div class="u-flex u-gap-2 u-items-center" style="margin-bottom: 8px;">
          <Button size="small" @click="cyclePosition">
            切换位置：{{ tabsPosition }}
          </Button>
          <Button size="small" @click="showPosition = !showPosition">
            {{ showPosition ? '关闭' : '打开' }}表情
          </Button>
        </div>
        <EmojiPicker
          v-model:show="showPosition"
          :sticker-packs="stickerPacks"
          :tabs-position="tabsPosition"
        />
      </div>
    </Variant>

    <Variant title="tab 预览小图 + emoji 放大预览">
      <div style="width: 340px;">
        <div class="u-flex u-gap-2 u-items-center" style="margin-bottom: 8px;">
          <Button size="small" @click="showTabIcons = !showTabIcons">
            {{ showTabIcons ? '关闭' : '打开' }}表情
          </Button>
          <span v-if="tabIconInfo" style="font-size: var(--uikit-font-size-13); color: var(--uikit-text-secondary);">
            {{ tabIconInfo }}
          </span>
        </div>
        <EmojiPicker
          v-model:show="showTabIcons"
          :sticker-packs="stickerPacks"
          :emoji-icon="placeholder('#0ea5e9', 'E')"
          :emoji-preview="true"
          @select="onTabIconSelect"
        />
        <p style="font-size: var(--uikit-font-size-12); color: var(--uikit-text-tertiary); margin-top: 8px;">
          表情视图 tab 可配预览小图（emojiIcon），表情包取 iconUrl 或自动回落包内第一个 sticker 预览图；内置 emoji 悬停显示放大预览（emojiPreview 可关闭）。
        </p>
      </div>
    </Variant>
  </Story>
</template>
