<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import Icon from '../../components/icon/icon.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'

export interface GroupAnnouncementBannerProps {
  groupId: string
}

const props = defineProps<GroupAnnouncementBannerProps>()

const { t } = useLocale()
const { stores } = useUIKit()

const announcement = computed(() => stores.group.getGroupAnnouncement(props.groupId))
// 默认单行省略；仅当内容确实超出一行时才提供展开/收起交互
const collapsed = ref(true)
const canExpand = ref(false)
const textRef = ref<HTMLDivElement>()
const hasAnnouncement = computed(() => !!announcement.value)

function measureOverflow() {
  const el = textRef.value
  // 仅在折叠态测量：展开态 scrollHeight 等于 clientHeight，无法判断是否超一行
  if (!el || !collapsed.value)
    return
  canExpand.value = el.scrollHeight > el.clientHeight + 1
}

watch(
  () => announcement.value,
  () => {
    // 内容更新后回到默认单行省略，并重新判断是否需要折叠交互
    collapsed.value = true
    nextTick(measureOverflow)
  },
  { immediate: true },
)

watch(collapsed, (val) => {
  if (val)
    nextTick(measureOverflow)
})

onMounted(measureOverflow)
useResizeObserver(textRef, measureOverflow)
</script>

<template>
  <div
    v-if="hasAnnouncement"
    class="group-announcement-banner"
    :class="{ 'is-collapsed': collapsed }"
  >
    <div class="group-announcement-banner__main">
      <Icon class="group-announcement-banner__icon" name="group/board" :size="14" />
      <div class="group-announcement-banner__content">
        <div class="group-announcement-banner__title">
          {{ t('chat.announcementBanner.title', '群公告') }}
        </div>
        <div ref="textRef" class="group-announcement-banner__text" :class="{ 'is-collapsed': collapsed }">
          {{ announcement }}
        </div>
      </div>
    </div>
    <button
      v-if="canExpand"
      class="group-announcement-banner__toggle"
      :title="collapsed ? (t('chat.announcementBanner.expand', '展开')) : (t('chat.announcementBanner.collapse', '收起'))"
      @click="collapsed = !collapsed"
    >
      <Icon :name="collapsed ? 'navigation/chevron_down' : 'navigation/chevron_up'" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.group-announcement-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background-color: var(--uikit-bg-secondary);
  border-bottom: 1px solid var(--uikit-border-light, rgba(0, 0, 0, 0.04));
  flex-shrink: 0;
}

.group-announcement-banner__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.group-announcement-banner__icon {
  flex-shrink: 0;
  color: var(--uikit-warning-color, #f59e0b);
  margin-top: 2px;
}

.group-announcement-banner__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-announcement-banner__title {
  font-size: var(--uikit-font-size-12);
  font-weight: 500;
  color: var(--uikit-text-secondary);
}

.group-announcement-banner__text {
  font-size: var(--uikit-font-size-13);
  line-height: 1.5;
  color: var(--uikit-text-primary);
  word-break: break-word;
  white-space: pre-wrap;
  transition: max-height var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

.group-announcement-banner__text.is-collapsed {
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.group-announcement-banner__toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 6px);
  transition: background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
  .group-announcement-banner__toggle:hover {
    background-color: var(--uikit-bg-hover);
  }
}
</style>
