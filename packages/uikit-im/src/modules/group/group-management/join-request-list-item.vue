<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'

export interface JoinRequestListItemProps {
  item: any
}

const props = defineProps<JoinRequestListItemProps>()

const emit = defineEmits<{
  (e: 'accept'): void
  (e: 'reject'): void
}>()

const { t } = useLocale()

const applicantId = computed(() => props.item.applicant?.userId || '')

const { displayName, avatarUrl } = useUserInfo(applicantId)
</script>

<template>
  <div class="join-request-list__item">
    <Avatar
      class="join-request-list__avatar"
      :name="displayName"
      :src="avatarUrl"
      :size="36"
    />
    <div class="join-request-list__info">
      <span class="join-request-list__name">{{ displayName }}</span>
      <span v-if="props.item.reason" class="join-request-list__reason">
        {{ props.item.reason }}
      </span>
      <span
        v-if="props.item.status === 'declined'"
        class="join-request-list__status join-request-list__status--declined"
      >
        {{ t('contact.inviteDeclined', '已拒绝') }}
      </span>
      <span
        v-else-if="props.item.status === 'accepted'"
        class="join-request-list__status join-request-list__status--accepted"
      >
        {{ t('contact.inviteAccepted', '已接受') }}
      </span>
    </div>
    <div v-if="props.item.status === 'pending'" class="join-request-list__actions">
      <button class="join-request-list__action-btn join-request-list__action-btn--accept" @click="emit('accept')">
        {{ t('group.joinRequest.accept', '同意') }}
      </button>
      <button class="join-request-list__action-btn join-request-list__action-btn--reject" @click="emit('reject')">
        {{ t('group.joinRequest.reject', '拒绝') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.join-request-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.join-request-list__avatar {
  flex-shrink: 0;
}
.join-request-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.join-request-list__name {
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.join-request-list__reason {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.join-request-list__status {
  font-size: var(--uikit-font-size-11);
  padding: 1px 5px;
  border-radius: 4px;
  width: fit-content;
}
.join-request-list__status--declined {
  background-color: rgba(var(--uikit-danger-rgb), 0.12);
  color: var(--uikit-danger-color);
}
.join-request-list__status--accepted {
  background-color: rgba(var(--uikit-success-rgb), 0.12);
  color: var(--uikit-success-color);
}
.join-request-list__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.join-request-list__action-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-12);
  cursor: pointer;
  transition: all var(--uikit-anim-duration) var(--uikit-anim-easing);
}
@media (hover: hover) {
  .join-request-list__action-btn:hover {
    background-color: var(--uikit-bg-secondary);
  }
}
.join-request-list__action-btn--accept {
  border-color: rgba(var(--uikit-success-rgb), 0.25);
  color: var(--uikit-success-color);
}
@media (hover: hover) {
  .join-request-list__action-btn--accept:hover {
    background-color: rgba(var(--uikit-success-rgb), 0.08);
  }
}
.join-request-list__action-btn--reject {
  border-color: rgba(var(--uikit-danger-rgb), 0.25);
  color: var(--uikit-danger-color);
}
@media (hover: hover) {
  .join-request-list__action-btn--reject:hover {
    background-color: rgba(var(--uikit-danger-rgb), 0.08);
  }
}
</style>
