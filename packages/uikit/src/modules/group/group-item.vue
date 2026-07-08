<script setup lang="ts">
import { computed } from 'vue'
import { useGroup } from '../../composables/use-group'
import type { UiGroup as Group } from '../../sdk/types'
import GroupItemDefault from './group-item-default.vue'
import type { AvatarShape, GroupItemSize, GroupSelectMode } from './types'

interface GroupItemProps {
  group: Group
  selectMode?: GroupSelectMode
  /** 是否禁用 */
  disabled?: boolean
  /** 是否展示群头像，默认 true */
  showAvatar?: boolean
  /** 是否展示成员数 */
  showMemberCount?: boolean
  /** 头像尺寸 */
  avatarSize?: number
  /** 头像形状 */
  avatarShape?: AvatarShape
  /** 副标题 */
  subtitle?: string
  /** Item 尺寸 */
  size?: GroupItemSize
}

const props = withDefaults(defineProps<GroupItemProps>(), {
  selectMode: 'none',
  disabled: false,
  showAvatar: true,
  showMemberCount: true,
  avatarShape: 'rounded',
  size: 'normal',
})

const emit = defineEmits<{
  (e: 'click', group: Group): void
  (e: 'contextmenu', event: MouseEvent, group: Group): void
}>()

const { activeId, isSelected, setActiveId, toggleSelect } = useGroup()

const active = computed(() => activeId.value === props.group.groupId)
const selected = computed(() => isSelected(props.group.groupId))
const showCheckbox = computed(() => props.selectMode === 'multiple')

function onClick() {
  if (props.disabled)
    return
  if (props.selectMode === 'multiple') {
    toggleSelect(props.group.groupId)
  }
  else {
    setActiveId(props.group.groupId)
  }
  emit('click', props.group)
}

function onContextmenu(e: MouseEvent) {
  if (props.disabled)
    return
  emit('contextmenu', e, props.group)
}
</script>

<template>
  <div
    class="group-item"
    :class="{ 'is-disabled': props.disabled }"
    :data-groupid="props.group.groupId"
    @click="onClick"
    @contextmenu="onContextmenu"
  >
    <slot
      :group="props.group"
      :active="active"
      :selected="selected"
      :disabled="props.disabled"
      :toggle-select="() => toggleSelect(props.group.groupId)"
    >
      <GroupItemDefault
        :group="props.group"
        :active="active"
        :selected="selected"
        :show-checkbox="showCheckbox"
        :show-avatar="props.showAvatar"
        :show-member-count="props.showMemberCount"
        :avatar-size="props.avatarSize"
        :avatar-shape="props.avatarShape"
        :subtitle="props.subtitle"
        :disabled="props.disabled"
        :size="props.size"
      >
        <template v-if="$slots.avatar" #avatar="slotProps">
          <slot name="avatar" v-bind="slotProps" />
        </template>
        <template v-if="$slots.extra" #extra="slotProps">
          <slot name="extra" v-bind="slotProps" />
        </template>
      </GroupItemDefault>
    </slot>
  </div>
</template>

<style scoped>
.group-item {
  display: block;
}
.group-item.is-disabled {
  pointer-events: auto;
}
</style>
