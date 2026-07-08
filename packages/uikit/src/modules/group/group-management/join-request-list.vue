<script setup lang="ts">
import { ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'

export interface JoinRequestListProps {
  groupId: string
}

const props = defineProps<JoinRequestListProps>()

const emit = defineEmits<{
  (e: 'accepted', userId: string): void
  (e: 'rejected', userId: string): void
}>()

const { t } = useLocale()
const { stores } = useUIKit()
const { acceptGroupJoinRequest, rejectGroupJoinRequest } = useGroup()

const loading = ref(false)

const requests = ref<any[]>([])

watch(() => props.groupId, () => {
  requests.value = stores.group.groupJoinRequestsMap[props.groupId] || []
}, { immediate: true })

// 监听 store 变化
watch(
  () => stores.group.groupJoinRequestsMap[props.groupId],
  (val) => {
    requests.value = val || []
  },
  { deep: true },
)

function displayName(item: any): string {
  const applicant = item.applicant
  return applicant?.nickname || applicant?.userId || ''
}

function applicantId(item: any): string {
  return item.applicant?.userId || ''
}

async function onAccept(item: any) {
  const uid = applicantId(item)
  try {
    await acceptGroupJoinRequest(props.groupId, uid)
    requests.value = requests.value.filter((r: any) => applicantId(r) !== uid)
    emit('accepted', uid)
  }
  catch (err) {
    console.warn('[JoinRequestList] accept failed:', err)
  }
}

async function onReject(item: any) {
  const uid = applicantId(item)
  try {
    await rejectGroupJoinRequest(props.groupId, uid, '')
    requests.value = requests.value.filter((r: any) => applicantId(r) !== uid)
    emit('rejected', uid)
  }
  catch (err) {
    console.warn('[JoinRequestList] reject failed:', err)
  }
}
</script>

<template>
  <div class="join-request-list">
    <div v-if="loading" class="join-request-list__loading">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="requests.length === 0" class="join-request-list__empty">
      {{ t('group.memberList.empty') || '暂无入群申请' }}
    </div>
    <div
      v-for="item in requests"
      :key="applicantId(item) || item.timestamp"
      class="join-request-list__item"
    >
      <Avatar
        class="join-request-list__avatar"
        :name="displayName(item)"
        :size="36"
      />
      <div class="join-request-list__info">
        <span class="join-request-list__name">{{ displayName(item) }}</span>
        <span v-if="item.reason" class="join-request-list__reason">
          {{ item.reason }}
        </span>
        <span
          v-if="item.status === 'declined'"
          class="join-request-list__status join-request-list__status--declined"
        >
          {{ t('contact.inviteDeclined') || '已拒绝' }}
        </span>
        <span
          v-else-if="item.status === 'accepted'"
          class="join-request-list__status join-request-list__status--accepted"
        >
          {{ t('contact.inviteAccepted') || '已接受' }}
        </span>
      </div>
      <div v-if="item.status === 'pending'" class="join-request-list__actions">
        <button class="join-request-list__action-btn join-request-list__action-btn--accept" @click="onAccept(item)">
          {{ t('group.joinRequest.accept') || '同意' }}
        </button>
        <button class="join-request-list__action-btn join-request-list__action-btn--reject" @click="onReject(item)">
          {{ t('group.joinRequest.reject') || '拒绝' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.join-request-list {
  padding: 8px 0;
}
.join-request-list__loading,
.join-request-list__empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
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
