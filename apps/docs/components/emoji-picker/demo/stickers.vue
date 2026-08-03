<script setup lang="ts">
import { ref } from 'vue'
import type { EmojiStickerItem, EmojiStickerPack } from '@easemob/uikit'

const show = ref(true)
const selectedSticker = ref('')

/** 生成纯色 SVG 占位图（data URI，离线可用） */
function placeholder(color: string, text: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="16" fill="${color}"/><text x="48" y="58" font-size="28" text-anchor="middle" fill="#fff">${text}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const stickerPacks: EmojiStickerPack[] = [
  {
    id: 'pack-cat',
    name: '猫猫',
    iconUrl: placeholder('#f59e0b', '猫'),
    stickers: [
      { key: 'cat-1', url: placeholder('#f59e0b', '喵'), name: '喵' },
      { key: 'cat-2', url: placeholder('#fbbf24', '嗷'), name: '嗷' },
      { key: 'cat-3', url: placeholder('#fcd34d', '呜'), name: '呜' },
    ],
  },
  {
    id: 'pack-doge',
    name: '狗狗',
    stickers: [
      { key: 'doge-1', url: placeholder('#10b981', '汪'), name: '汪' },
      { key: 'doge-2', url: placeholder('#34d399', '旺'), name: '旺' },
    ],
  },
]

function onSelectSticker(sticker: EmojiStickerItem, packId: string) {
  selectedSticker.value = `${packId} / ${sticker.name || sticker.key}`
}
</script>

<template>
  <div style="width: 340px;">
    <div
      style="
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      "
    >
      <em-button size="small" @click="show = !show">
        {{ show ? '关闭' : '打开' }}表情
      </em-button>
      <span v-if="selectedSticker" style="font-size: 13px; color: var(--uikit-text-secondary);">
        已选择表情包：{{ selectedSticker }}
      </span>
    </div>
    <em-emoji-picker
      v-model:show="show"
      :sticker-packs="stickerPacks"
      @select-sticker="onSelectSticker"
    />
  </div>
</template>
