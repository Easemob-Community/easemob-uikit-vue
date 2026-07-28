<script setup lang="ts">
import Avatar from '../../../components/avatar/avatar.vue'
import Cell from '../../../components/cell/cell.vue'
import { useUserInfo } from '../../../composables/use-user-info'
import type { UiGroupMember } from '../../../sdk/types'

const props = defineProps<{
  member: UiGroupMember
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const { displayName, avatarUrl } = useUserInfo(() => props.member.userId)
</script>

<template>
  <Cell
    class="mute-list__popup-item"
    size="compact"
    :title="displayName"
    :selected="props.selected"
    @click="emit('toggle')"
  >
    <template #leading>
      <Avatar :name="displayName" :src="avatarUrl" :size="36" />
    </template>
    <template #trailing>
      <span
        class="mute-list__popup-checkbox"
        :class="{ 'mute-list__popup-checkbox--checked': props.selected }"
      />
    </template>
  </Cell>
</template>

<style scoped>
.mute-list__popup-item {
  --uikit-item-hover-padding-x: 16px;
}
.mute-list__popup-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--uikit-border-color, #d1d5db);
  flex-shrink: 0;
  transition: all 0.15s;
}
.mute-list__popup-checkbox--checked {
  border-color: var(--uikit-primary-color);
  background-color: var(--uikit-primary-color);
}
</style>
