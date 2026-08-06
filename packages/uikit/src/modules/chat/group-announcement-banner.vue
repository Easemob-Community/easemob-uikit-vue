<script setup lang="ts">
import { computed, ref } from 'vue'
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
const collapsed = ref(false)
const hasAnnouncement = computed(() => !!announcement.value)
</script>

<template>
  <div
    v-if="hasAnnouncement"
    class="group-announcement-banner"
    :class="{ 'is-collapsed': collapsed }"
  >
    <div class="group-announcement-banner__main">
      <Icon class="group-announcement-banner__icon" name="chat/pin" :size="14" />
      <div class="group-announcement-banner__content">
        <div class="group-announcement-banner__title">
          {{ t('chat.announcementBanner.title', '群公告') }}
        </div>
        <div class="group-announcement-banner__text" :class="{ 'is-collapsed': collapsed }">
          {{ announcement }}
        </div>
      </div>
    </div>
    <button
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
