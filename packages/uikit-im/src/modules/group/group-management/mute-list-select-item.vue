<script setup lang="ts">
import { EmAvatar as Avatar } from '@easemob-community/uikit-core'
import { EmCell as Cell } from '@easemob-community/uikit-core'
import { EmCheckbox as Checkbox } from '@easemob-community/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'
import type { UiGroupMember } from '@easemob-community/uikit-core'

export interface MuteListSelectItemProps {
  member: UiGroupMember
  selected: boolean
}

const props = defineProps<MuteListSelectItemProps>()

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
      <Checkbox :checked="props.selected" />
    </template>
  </Cell>
</template>

<style scoped>
.mute-list__popup-item {
  --uikit-item-hover-padding-x: 16px;
}
</style>
