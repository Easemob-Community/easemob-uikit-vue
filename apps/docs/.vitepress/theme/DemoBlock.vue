<script setup lang="ts">
import { AntdTheme } from 'vite-plugin-vitepress-demo/theme'

// UIKit 组件依赖浏览器环境（window/document），不能在 VitePress SSR 预渲染阶段执行，
// 因此用 ClientOnly 包裹，仅在客户端挂载后渲染 demo 本体。
defineProps<{
  src: string
  title?: string
  desc?: string
  raw?: boolean
}>()
</script>

<template>
  <ClientOnly>
    <AntdTheme :src="src" :title="title" :desc="desc" :raw="raw" />
    <template #fallback>
      <div class="demo-block-loading" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.demo-block-loading {
  min-height: 48px;
  margin: 0 0 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}
</style>
