<script setup lang="ts">
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import type { Contact } from '../../store/contact'

const props = withDefaults(defineProps<{
  contact: Contact
  active?: boolean
  selected?: boolean
  /** 是否处于多选模式（左侧展示选择框） */
  showCheckbox?: boolean
}>(), {
  active: false,
  selected: false,
  showCheckbox: false,
})
</script>

<template>
  <div
    class="contact-item-default"
    :class="{ 'is-active': props.active, 'is-selected': props.selected }"
  >
    <span v-if="props.showCheckbox" class="contact-item-default__check">
      <Icon
        :name="props.selected ? 'actions/checked_ellipse' : 'actions/unchecked_ellipse'"
        :size="20"
      />
    </span>
    <Avatar
      class="contact-item-default__avatar"
      :src="props.contact.avatar"
      :name="props.contact.remark || props.contact.name"
      :size="40"
    />
    <span class="contact-item-default__name">
      {{ props.contact.remark || props.contact.name }}
    </span>
  </div>
</template>

<style scoped>
.contact-item-default {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: var(--contact-item-height, 56px);
  cursor: pointer;
  transition: background-color 0.15s;
}

.contact-item-default:hover {
  background-color: var(--uikit-bg-secondary);
}

.contact-item-default.is-active {
  background-color: var(--contact-active-bg, var(--uikit-bg-secondary));
}

.contact-item-default__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--uikit-text-secondary);
}

.contact-item-default.is-selected .contact-item-default__check {
  color: var(--uikit-primary, #155EEF);
}

.contact-item-default__avatar {
  flex-shrink: 0;
}

.contact-item-default__name {
  flex: 1;
  font-size: 14px;
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
