<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../components/icon/icon.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'

export interface GroupAnnouncementBannerProps {
  groupId: string
}

const props = defineProps<GroupAnnouncementBannerProps>()

const { t } = useLocale()
const { stores } = useUIKit()

const announcement = computed(() => stores.group.getGroupAnnouncement(props.groupId))
const history = computed(() => stores.group.getGroupAnnouncementHistory(props.groupId))
const latestMeta = computed(() => history.value[0])

const collapsed = ref(false)

const hasAnnouncement = computed(() => !!announcement.value)

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const updaterName = computed(() => {
  const updater = latestMeta.value?.updater
  if (!updater)
    return ''
  const contact = stores.contact.getContact(updater)
  const userInfo = stores.userInfo.getUserInfo(updater)
  return contact?.remark || userInfo?.nickname || updater
})
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
          {{ t('chat.announcementBanner.title') || '群公告' }}
          <span v-if="updaterName || latestMeta?.updateTime" class="group-announcement-banner__meta">
            {{ updaterName }}{{ updaterName && latestMeta?.updateTime ? ' · ' : '' }}{{ latestMeta?.updateTime ? formatTime(latestMeta.updateTime) : '' }}
          </span>
        </div>
        <div class="group-announcement-banner__text" :class="{ 'is-collapsed': collapsed }">
          {{ announcement }}
        </div>
      </div>
    </div>
    <button
      class="group-announcement-banner__toggle"
      :title="collapsed ? (t('chat.announcementBanner.expand') || '展开') : (t('chat.announcementBanner.collapse') || '收起')"
      @click="collapsed = !collapsed"
    >
      <Icon :name="collapsed ? 'arrows/arrow_down' : 'arrows/arrow_up_thick'" :size="14" />
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
  font-size: 12px;
  font-weight: 500;
  color: var(--uikit-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-announcement-banner__meta {
  font-weight: 400;
  color: var(--uikit-text-secondary);
  opacity: 0.8;
}

.group-announcement-banner__text {
  font-size: 13px;
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

.group-announcement-banner__toggle:hover {
  background-color: var(--uikit-bg-hover);
}
</style>
