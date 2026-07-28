<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'
import { useUserInfo } from '../../../composables/use-user-info'

const props = defineProps<{
  item: any
}>()

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
        {{ t('contact.inviteDeclined') || '已拒绝' }}
      </span>
      <span
        v-else-if="props.item.status === 'accepted'"
        class="join-request-list__status join-request-list__status--accepted"
      >
        {{ t('contact.inviteAccepted') || '已接受' }}
      </span>
    </div>
    <div v-if="props.item.status === 'pending'" class="join-request-list__actions">
      <button class="join-request-list__action-btn join-request-list__action-btn--accept" @click="emit('accept')">
        {{ t('group.joinRequest.accept') || '同意' }}
      </button>
      <button class="join-request-list__action-btn join-request-list__action-btn--reject" @click="emit('reject')">
        {{ t('group.joinRequest.reject') || '拒绝' }}
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
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.join-request-list__reason {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.join-request-list__status {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  width: fit-content;
}
.join-request-list__status--declined {
  background-color: #fee2e2;
  color: #dc2626;
}
.join-request-list__status--accepted {
  background-color: #d1fae5;
  color: #059669;
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
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.join-request-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
.join-request-list__action-btn--accept {
  border-color: #bbf7d0;
  color: #16a34a;
}
.join-request-list__action-btn--accept:hover {
  background-color: #f0fdf4;
}
.join-request-list__action-btn--reject {
  border-color: #fecaca;
  color: #ef4444;
}
.join-request-list__action-btn--reject:hover {
  background-color: #fef2f2;
}
</style>
