<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_ALPHABET_KEYS, type ContactGroupItem } from './types'

interface ContactAlphabetNavProps {
  /** 当前已渲染的分组数据，用于禁用空字母（与 keys 二选一） */
  groups?: ContactGroupItem[]
  /** 已有的分组 key 列表（通用现，与 groups 二选一；优先级高于 groups） */
  keys?: string[]
  /** 当前激活的字母（高亮） */
  activeKey?: string
  /** 是否禁用未存在的字母（变浅色） */
  dimEmpty?: boolean
}

const props = withDefaults(defineProps<ContactAlphabetNavProps>(), {
  groups: () => [],
  activeKey: '',
  dimEmpty: true,
})

const emit = defineEmits<{
  (e: 'jump', key: string): void
}>()

const existKeys = computed(() => {
  if (props.keys && props.keys.length) return new Set(props.keys)
  return new Set(props.groups.map((g) => g.key))
})

function onTap(key: string) {
  if (props.dimEmpty && !existKeys.value.has(key)) return
  emit('jump', key)
}
</script>

<template>
  <div class="contact-alphabet-nav">
    <span
      v-for="key in DEFAULT_ALPHABET_KEYS"
      :key="key"
      class="contact-alphabet-nav__item"
      :class="{
        'is-active': props.activeKey === key,
        'is-empty': props.dimEmpty && !existKeys.has(key),
      }"
      @click="onTap(key)"
    >
      {{ key }}
    </span>
  </div>
</template>

<style scoped>
.contact-alphabet-nav {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: 12px;
  background-color: transparent;
  user-select: none;
  z-index: 10;
}

.contact-alphabet-nav__item {
  font-size: var(--uikit-font-size-11);
  line-height: 1;
  padding: 2px 4px;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
  border-radius: 4px;
}

@media (hover: hover) {
.contact-alphabet-nav__item:hover {
  color: var(--uikit-text-primary);
  background-color: var(--uikit-bg-secondary);
}
}

.contact-alphabet-nav__item.is-active {
  color: #ffffff;
  background-color: var(--uikit-primary-color);
}

.contact-alphabet-nav__item.is-empty {
  color: var(--uikit-text-tertiary, #c0c4cc);
  cursor: default;
}

@media (hover: hover) {
.contact-alphabet-nav__item.is-empty:hover {
  background-color: transparent;
  color: var(--uikit-text-tertiary, #c0c4cc);
}
}
</style>
