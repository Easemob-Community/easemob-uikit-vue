# EmojiPicker 表情选择器

表情与表情包选择器，支持内置 Emoji 分类与自定义表情包（Sticker）数据。

## 使用方式

组件以 `EmEmojiPicker` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)

function onSelect(emoji: string) {
  console.log(emoji)
}
</script>

<template>
  <em-button @click="show = true">选择表情</em-button>
  <em-emoji-picker v-model:show="show" @select="onSelect" />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="v-model:show 控制面板显隐；select 事件回传选中的表情字符。" />

## 表情包

<demo src="./demo/stickers.vue" title="表情包" desc="通过 sticker-packs 传入表情包数据（EmojiStickerPack），select-sticker 回传表情与包 ID；本 Demo 使用离线 SVG 占位图。" />

## API

<!-- @include: ../.vitepress/gen/emoji-picker.md -->
