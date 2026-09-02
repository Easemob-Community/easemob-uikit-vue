<script setup lang="ts">
/**
 * 水印演示组件
 *
 * 配合 #watermark 插槽注入 EmChatContainer / EmContactContainer：
 * UIKit 提供铺满容器、pointer-events:none 的覆盖层壳，本组件负责平铺水印内容。
 * 业务侧可替换为 canvas / SVG 背景等任意实现。
 */
interface Props {
  /** 水印文案（通常为当前用户名 / 用户 ID） */
  text: string
}

const props = defineProps<Props>()

/** 平铺块数量：铺满常见面板尺寸足够，溢出由覆盖层 overflow:hidden 裁掉 */
const TILE_COUNT = 24
const tiles = Array.from({ length: TILE_COUNT }, (_, i) => i)
</script>

<template>
  <div class="demo-watermark" aria-hidden="true">
    <span v-for="i in tiles" :key="i" class="demo-watermark__tile">{{ props.text }}</span>
  </div>
</template>

<style scoped>
.demo-watermark {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-content: space-evenly;
  justify-content: space-evenly;
  overflow: hidden;
}

.demo-watermark__tile {
  margin: 32px 48px;
  font-size: 14px;
  white-space: nowrap;
  color: var(--uikit-text-primary);
  opacity: 0.08;
  transform: rotate(-20deg);
  user-select: none;
}
</style>
