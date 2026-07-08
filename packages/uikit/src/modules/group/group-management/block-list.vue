<script setup lang="ts">
import { ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import type { UiGroupMember } from '../../../sdk/types'

export interface BlockListProps {
  groupId: string
}

const props = defineProps<BlockListProps>()

const emit = defineEmits<{
  (e: 'unblock', member: UiGroupMember): void
}>()

const { t } = useLocale()
const { getGroupBlocklist: fetchBlocklist, unblockGroupMembers } = useGroup()

const loading = ref(false)
const members = ref<any[]>([])

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchBlocklist(props.groupId)
    members.value = Array.isArray(result) ? result : []
  }
  catch (err) {
    console.warn('[BlockList] load failed:', err)
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

async function onUnblock(item: any) {
  const uid = userId(item)
  try {
    await unblockGroupMembers(props.groupId, [uid])
    members.value = members.value.filter((m: any) => userId(m) !== uid)
    emit('unblock', { userId: uid })
  }
  catch (err) {
    console.warn('[BlockList] unblock failed:', err)
  }
}
</script>

<template>
  <div class="block-list">
    <div v-if="loading" class="block-list__loading">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="members.length === 0" class="block-list__empty">
      {{ t('group.memberList.empty') || '暂无黑名单成员' }}
    </div>
    <div
      v-for="item in members"
      :key="userId(item)"
      class="block-list__item"
    >
      <Avatar
        class="block-list__avatar"
        :name="displayName(item)"
        :size="36"
      />
      <div class="block-list__info">
        <span class="block-list__name">{{ displayName(item) }}</span>
      </div>
      <button class="block-list__action-btn" @click="onUnblock(item)">
        {{ t('group.memberList.unblock') || '移出黑名单' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.block-list {
  padding: 8px 0;
}
.block-list__loading,
.block-list__empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
.block-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.block-list__avatar {
  flex-shrink: 0;
}
.block-list__info {
  flex: 1;
  min-width: 0;
}
.block-list__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.block-list__action-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.block-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
</style>
