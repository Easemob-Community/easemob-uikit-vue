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
  (e: 'unblock'): void
}>()

const { t } = useLocale()

const userId = computed(() => {
  const user = props.item.user || props.item
  return user?.userId || ''
})

const { displayName, avatarUrl } = useUserInfo(userId)
</script>

<template>
  <Cell
    class="block-list__item"
    size="compact"
    :title="displayName"
    :clickable="false"
  >
    <template #leading>
      <Avatar :name="displayName" :src="avatarUrl" :size="36" />
    </template>
    <template #trailing>
      <button class="block-list__action-btn" @click.stop="emit('unblock')">
        {{ t('group.memberList.unblock') || '移出黑名单' }}
      </button>
    </template>
  </Cell>
</template>

<style scoped>
.block-list__item {
  --uikit-item-hover-padding-x: 16px;
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
