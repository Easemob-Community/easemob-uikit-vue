<script setup lang="ts">
import { computed } from 'vue'
import { useContact } from '../../composables/use-contact'
import type { UiContact as Contact } from '../../sdk/types'
import ContactItemDefault from './contact-item-default.vue'
import type { AvatarShape, ContactItemSize, ContactSelectMode, OnlineStatus } from './types'

const props = withDefaults(defineProps<{
  contact: Contact
  selectMode?: ContactSelectMode
  /** 是否禁用 */
  disabled?: boolean
  /** 是否展示头像，默认 true */
  showAvatar?: boolean
  /** 头像尺寸 */
  avatarSize?: number
  /** 头像形状 */
  avatarShape?: AvatarShape
  /** 副标题 */
  subtitle?: string
  /** 在线状态 */
  onlineStatus?: OnlineStatus
  /** Item 尺寸 */
  size?: ContactItemSize
}>(), {
  selectMode: 'none',
  disabled: false,
  showAvatar: true,
  avatarShape: 'circle',
  size: 'normal',
})

const emit = defineEmits<{
  (e: 'click', contact: Contact): void
  (e: 'contextmenu', event: MouseEvent, contact: Contact): void
}>()

const { activeId, isSelected, setActiveId, toggleSelect } = useContact()

const active = computed(() => activeId.value === props.contact.userId)
const selected = computed(() => isSelected(props.contact.userId))
const showCheckbox = computed(() => props.selectMode === 'multiple')

function onClick() {
  if (props.disabled)
    return
  if (props.selectMode === 'multiple') {
    toggleSelect(props.contact.userId)
  }
  else if (props.selectMode === 'single') {
    setActiveId(props.contact.userId)
  }
  else {
    setActiveId(props.contact.userId)
  }
  emit('click', props.contact)
}

function onContextmenu(e: MouseEvent) {
  if (props.disabled)
    return
  emit('contextmenu', e, props.contact)
}
</script>

<template>
  <div
    class="contact-item"
    :class="{ 'is-disabled': props.disabled }"
    :data-userid="props.contact.userId"
    @click="onClick"
    @contextmenu="onContextmenu"
  >
    <slot
      :contact="props.contact"
      :active="active"
      :selected="selected"
      :disabled="props.disabled"
      :toggle-select="() => toggleSelect(props.contact.userId)"
    >
      <ContactItemDefault
        :contact="props.contact"
        :active="active"
        :selected="selected"
        :show-checkbox="showCheckbox"
        :show-avatar="props.showAvatar"
        :avatar-size="props.avatarSize"
        :avatar-shape="props.avatarShape"
        :subtitle="props.subtitle"
        :online-status="props.onlineStatus"
        :disabled="props.disabled"
        :size="props.size"
      >
        <template v-if="$slots.avatar" #avatar="slotProps">
          <slot name="avatar" v-bind="slotProps" />
        </template>
        <template v-if="$slots.extra" #extra="slotProps">
          <slot name="extra" v-bind="slotProps" />
        </template>
      </ContactItemDefault>
    </slot>
  </div>
</template>

<style scoped>
.contact-item {
  display: block;
}
.contact-item.is-disabled {
  pointer-events: auto;
}
</style>
