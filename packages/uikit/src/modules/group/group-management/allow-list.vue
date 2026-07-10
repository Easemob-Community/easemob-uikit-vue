<script setup lang="ts">
import { ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { createLogger } from '../../../utils/logger'
import type { UiGroupMember } from '../../../sdk/types'

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

function displayName(item: any): string {
  const user = item.user || item
  return user?.nickname || user?.userId || ''
}

function userId(item: any): string {
  const user = item.user || item
  return user?.userId || ''
}

async function onRemove(item: any) {
  const uid = userId(item)
  try {
    await removeUsersFromGroupAllowlist(props.groupId, [uid])
    members.value = members.value.filter((m: any) => userId(m) !== uid)
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
    <div v-else-if="members.length === 0" class="allow-list__empty">
      {{ t('group.memberList.empty') || '暂无白名单成员' }}
    </div>
    <div
      v-for="item in members"
      :key="userId(item)"
      class="allow-list__item"
    >
      <Avatar
        class="allow-list__avatar"
        :name="displayName(item)"
        :size="36"
      />
      <div class="allow-list__info">
        <span class="allow-list__name">{{ displayName(item) }}</span>
      </div>
      <button class="allow-list__action-btn allow-list__action-btn--danger" @click="onRemove(item)">
        {{ t('group.memberList.remove') || '移出白名单' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.allow-list {
  padding: 8px 0;
}
.allow-list__loading,
.allow-list__empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
.allow-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.allow-list__avatar {
  flex-shrink: 0;
}
.allow-list__info {
  flex: 1;
  min-width: 0;
}
.allow-list__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.allow-list__action-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.allow-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
.allow-list__action-btn--danger {
  border-color: #fecaca;
  color: #ef4444;
}
.allow-list__action-btn--danger:hover {
  background-color: #fef2f2;
}
</style>
