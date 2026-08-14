<script setup lang="ts">
/**
 * 站点全局 Layout：接管 VitePress 默认布局并注入：
 * 1. 暗色切换圆形扩散动效（View Transitions，antfu vitepress skill 规范落地）
 * 2. 首页 hero 版本徽章（#home-hero-info-after 插槽，不覆盖默认 name/text/tagline）
 */
import { nextTick, provide } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
const { isDark } = useData()
// injected by vite define, see vite.config.ts
const version = __EASEMOB_UIKIT_VERSION__

/**
 * 接管暗色切换：以点击位置为圆心做圆形扩散过渡。
 * 不支持 startViewTransition 的浏览器直接切换（降级）。
 */
provide('toggle-appearance', async ({ clientX: x, clientY: y }: { clientX: number, clientY: number }) => {
  if (!document.startViewTransition) {
    isDark.value = !isDark.value
    return
  }

  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px at ${x}px ${y}px)`,
  ]

  await document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  }).ready

  document.documentElement.animate(
    { clipPath: isDark.value ? clipPath.reverse() : clipPath },
    {
      duration: 320,
      easing: 'ease-in',
      pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`,
    },
  )
})
</script>

<template>
  <Layout>
    <!-- home hero: version badge after tagline (before actions)，不覆盖默认 name/text/tagline -->
    <template #home-hero-info-after>
      <p class="uikit-hero-version">
        <span class="doc-badge">v{{ version }}</span>
      </p>
    </template>
  </Layout>
</template>

<style scoped>
.uikit-hero-version {
  margin: 14px 0 0;
  text-align: center;
}
</style>
