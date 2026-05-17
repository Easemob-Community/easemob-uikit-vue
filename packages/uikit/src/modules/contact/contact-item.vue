<script setup lang="ts">
import { computed } from 'vue'
import ContactItemDefault from './contact-item-default.vue'
import { useContact } from '../../composables/use-contact'
import type { ContactSelectMode } from './types'
import type { Contact } from '../../store/contact'

const props = withDefaults(defineProps<{
  contact: Contact
  selectMode?: ContactSelectMode
}>(), {
  selectMode: 'none',
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
  if (props.selectMode === 'multiple') {
    toggleSelect(props.contact.userId)
  } else if (props.selectMode === 'single') {
    setActiveId(props.contact.userId)
  } else {
    setActiveId(props.contact.userId)
  }
  emit('click', props.contact)
}

function onContextmenu(e: MouseEvent) {
  emit('contextmenu', e, props.contact)
}
</script>

<template>
  <div
    class="contact-item"
    :data-userid="props.contact.userId"
    @click="onClick"
    @contextmenu="onContextmenu"
  >
    <slot
      :contact="props.contact"
      :active="active"
      :selected="selected"
      :toggle-select="() => toggleSelect(props.contact.userId)"
    >
      <ContactItemDefault
        :contact="props.contact"
        :active="active"
        :selected="selected"
        :show-checkbox="showCheckbox"
      />
    </slot>
  </div>
</template>

<style scoped>
.contact-item {
  display: block;
}
</style>
