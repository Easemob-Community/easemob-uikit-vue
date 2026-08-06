<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import { useLocale } from '../../../locale'
import { useUserInfo } from '../../../composables/use-user-info'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits<{
  (e: 'remove'): void
}>()

const { t } = useLocale()

const userId = computed(() => {
  const user = props.item.user || props.item
  return user?.userId || ''
})

const { displayName, avatarUrl } = useUserInfo(userId)
</script>

<template>
  <div class="allow-list__item">
    <Avatar
      class="allow-list__avatar"
      :name="displayName"
      :src="avatarUrl"
      :size="36"
    />
    <div class="allow-list__info">
      <span class="allow-list__name">{{ displayName }}</span>
    </div>
    <button class="allow-list__action-btn allow-list__action-btn--danger" @click="emit('remove')">
      {{ t('group.memberList.remove', '移出白名单') }}
    </button>
  </div>
</template>

<style scoped>
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
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary);
}
.allow-list__action-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-12);
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
