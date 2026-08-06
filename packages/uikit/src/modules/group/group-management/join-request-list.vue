<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatSdkError } from '../../../utils/sdk-error'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import Empty from '../../../components/empty/empty.vue'
import JoinRequestListItem from './join-request-list-item.vue'

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

async function onAccept(item: any) {
  const uid = item.applicant?.userId || ''
  try {
    await acceptGroupJoinRequest(props.groupId, uid)
    requests.value = requests.value.filter((r: any) => (r.applicant?.userId || '') !== uid)
    emit('accepted', uid)
  }
  catch (err) {
    console.warn('[JoinRequestList] accept failed:', formatSdkError(err))
  }
}

async function onReject(item: any) {
  const uid = item.applicant?.userId || ''
  try {
    await rejectGroupJoinRequest(props.groupId, uid, '')
    requests.value = requests.value.filter((r: any) => (r.applicant?.userId || '') !== uid)
    emit('rejected', uid)
  }
  catch (err) {
    console.warn('[JoinRequestList] reject failed:', formatSdkError(err))
  }
}
</script>

<template>
  <div class="join-request-list">
    <div v-if="loading" class="join-request-list__loading">
      {{ t('common.loading') }}
    </div>
    <Empty
      v-else-if="requests.length === 0"
      icon="empty/members"
      :description="t('group.memberList.empty') || '暂无入群申请'"
      size="small"
    />
    <JoinRequestListItem
      v-for="item in requests"
      :key="(item.applicant?.userId || '') || item.timestamp"
      :item="item"
      @accept="onAccept(item)"
      @reject="onReject(item)"
    />
  </div>
</template>

<style scoped>
.join-request-list {
  padding: 8px 0;
}
.join-request-list__loading {
  text-align: center;
  padding: 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}
</style>
