<script setup lang="ts">
import { EmAvatar as Avatar } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'
import type { UiGroupMember } from '@easemob/uikit-core'

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
      <Icon
        :name="props.selected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
        :size="20"
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
  color: var(--uikit-text-tertiary, #94a3b8);
  flex-shrink: 0;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}
.mute-list__popup-checkbox--checked {
  color: var(--uikit-primary-color);
}
</style>
