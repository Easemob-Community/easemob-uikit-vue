<script setup lang="ts">
/**
 * 双 UIKit 文档切换器（顶部标题旁）：
 * 在「单群聊 UIKit」（@easemob/uikit-im）与「聊天室 UIKit」（@easemob/uikit-chatroom）
 * 两套文档之间切换。当前上下文由路由前缀判定：`/` 为单群聊，`/chatroom/` 为聊天室。
 * 小屏（≤960px）隐藏，此时切换入口由移动端菜单内的「语言」下拉承担。
 */
import { computed } from 'vue'
import { useData, useRouter } from 'vitepress'

const router = useRouter()
const { page } = useData()

const options = [
  { key: 'im', label: '单群聊 UIKit', link: '/' },
  { key: 'chatroom', label: '聊天室 UIKit', link: '/chatroom/' },
] as const

type OptionKey = (typeof options)[number]['key']

const currentKey = computed<OptionKey>(() =>
  page.value.relativePath.startsWith('chatroom') ? 'chatroom' : 'im',
)

function switchTo(link: string) {
  router.go(link)
}
</script>

<template>
  <div class="uikit-docs-switcher" role="group" aria-label="切换 UIKit 文档">
    <a
      v-for="opt in options"
      :key="opt.key"
      :href="opt.link"
      :class="{ active: currentKey === opt.key }"
      :aria-current="currentKey === opt.key ? 'true' : undefined"
      @click.prevent="switchTo(opt.link)"
    >{{ opt.label }}</a>
  </div>
</template>

<style scoped>
.uikit-docs-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 10px;
  padding: 3px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background-color: var(--vp-c-bg-alt);
  line-height: 1;
  white-space: nowrap;
}

.uikit-docs-switcher a {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s, background-color 0.2s;
}

.uikit-docs-switcher a:hover {
  color: var(--vp-c-text-1);
}

.uikit-docs-switcher a.active {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
  font-weight: 600;
}

/* 小屏让位于移动端菜单内的切换入口（nav-screen 语言下拉） */
@media (max-width: 960px) {
  .uikit-docs-switcher {
    display: none;
  }
}
</style>
