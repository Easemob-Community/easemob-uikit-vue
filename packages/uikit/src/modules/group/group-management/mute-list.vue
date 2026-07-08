<script setup lang="ts">
import { ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import type { UiGroupMember } from '../../../sdk/types'

export interface MuteListProps {
  groupId: string
}

const props = defineProps<MuteListProps>()

const emit = defineEmits<{
  (e: 'unmute', member: UiGroupMember): void
}>()

const { t } = useLocale()
const { getGroupMuteList: fetchMuteList, unmuteGroupMembers } = useGroup()

const loading = ref(false)
const members = ref<any[]>([])

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchMuteList(props.groupId)
    members.value = Array.isArray(result) ? result : []
  }
  catch (err) {
    console.warn('[MuteList] load failed:', err)
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

async function onUnmute(item: any) {
  const uid = userId(item)
  try {
    await unmuteGroupMembers(props.groupId, [uid])
    members.value = members.value.filter((m: any) => userId(m) !== uid)
    emit('unmute', { userId: uid })
  }
  catch (err) {
    console.warn('[MuteList] unmute failed:', err)
  }
}
</script>

<template>
  <div class="mute-list">
    <div v-if="loading" class="mute-list__loading">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="members.length === 0" class="mute-list__empty">
      {{ t('group.memberList.empty') || '暂无禁言成员' }}
    </div>
    <div
      v-for="item in members"
      :key="userId(item)"
      class="mute-list__item"
    >
      <Avatar
        class="mute-list__avatar"
        :name="displayName(item)"
        :size="36"
      />
      <div class="mute-list__info">
        <span class="mute-list__name">{{ displayName(item) }}</span>
      </div>
      <button class="mute-list__action-btn" @click="onUnmute(item)">
        {{ t('group.memberList.unmute') || '取消禁言' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.mute-list {
  padding: 8px 0;
}
.mute-list__loading,
.mute-list__empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
.mute-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.mute-list__avatar {
  flex-shrink: 0;
}
.mute-list__info {
  flex: 1;
  min-width: 0;
}
.mute-list__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.mute-list__action-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.mute-list__action-btn:hover {
  background-color: var(--uikit-bg-secondary);
}
</style>
