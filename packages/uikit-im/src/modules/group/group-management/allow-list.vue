<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocale } from '@easemob/uikit-core'
import { useGroup } from '../../../composables/use-group'
import { createLogger } from '@easemob/uikit-core'
import type { UiGroupMember } from '@easemob/uikit-core'
import AllowListItem from './allow-list-item.vue'
import { EmEmpty as Empty } from '@easemob/uikit-core'

export interface AllowListProps {
  groupId: string
}

const props = defineProps<AllowListProps>()

const emit = defineEmits<{
  (e: 'remove', member: UiGroupMember): void
}>()

const logger = createLogger('AllowList')
const { t } = useLocale()
const { getGroupAllowlist: fetchAllowlist, removeUsersFromGroupAllowlist } = useGroup()

const loading = ref(false)
const members = ref<any[]>([])

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchAllowlist(props.groupId)
    members.value = Array.isArray(result) ? result : []
  }
  catch (err) {
    logger.warn('load failed:', err)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })

async function onRemove(item: any) {
  const user = item.user || item
  const uid = user?.userId || ''
  try {
    await removeUsersFromGroupAllowlist(props.groupId, [uid])
    members.value = members.value.filter((m: any) => {
      const u = m.user || m
      return (u?.userId || '') !== uid
    })
    emit('remove', { userId: uid })
  }
  catch (err) {
    logger.warn('remove failed:', err)
  }
}
</script>

<template>
  <div class="allow-list">
    <div v-if="loading" class="allow-list__loading">
      {{ t('common.loading') }}
    </div>
    <Empty
      v-else-if="members.length === 0"
      icon="empty/members"
      :description="t('group.memberList.empty', '暂无白名单成员')"
      size="small"
    />
    <AllowListItem
      v-for="item in members"
      :key="(item.user || item)?.userId || ''"
      :item="item"
      @remove="onRemove(item)"
    />
  </div>
</template>

<style scoped>
.allow-list {
  padding: 8px 0;
}
.allow-list__loading {
  text-align: center;
  padding: 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}
</style>
