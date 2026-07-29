<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Cell from '../../../components/cell/cell.vue'
import { useLocale } from '../../../locale'
import { useUserInfo } from '../../../composables/use-user-info'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits<{
  (e: 'unmute'): void
}>()

const { t } = useLocale()

const userId = computed(() => {
  const user = props.item.user || props.item
  return user?.userId || ''
})

/** 禁言到期说明：muteExpire 缺失或非正数视为永久禁言（0.14.225+ SDK 返回该字段） */
const muteText = computed(() => {
  const expire = props.item?.muteExpire
  if (expire === undefined || expire === null || expire <= 0)
    return t('group.mutelist.permanent', '永久禁言')
  if (expire <= Date.now())
    return t('group.mutelist.expired', '禁言已到期')
  return `${t('group.mutelist.expireAt', '禁言至')} ${new Date(expire).toLocaleString()}`
})

const { displayName, avatarUrl } = useUserInfo(userId)
</script>

<template>
  <Cell
    class="mute-list__item"
    size="compact"
    :title="displayName"
    :subtitle="muteText"
    :clickable="false"
  >
    <template #leading>
      <Avatar :name="displayName" :src="avatarUrl" :size="36" />
    </template>
    <template #trailing>
      <button class="mute-list__action-btn" @click.stop="emit('unmute')">
        {{ t('group.memberList.unmute') || '取消禁言' }}
      </button>
    </template>
  </Cell>
</template>

<style scoped>
.mute-list__item {
  --uikit-item-hover-padding-x: 16px;
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
