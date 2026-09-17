<script setup lang="ts">
import { computed } from 'vue'
import { type ContactGroupItem, DEFAULT_ALPHABET_KEYS } from './types'

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
  if (props.keys && props.keys.length)
    return new Set(props.keys)
  return new Set(props.groups.map(g => g.key))
})

function onTap(key: string) {
  if (props.dimEmpty && !existKeys.value.has(key))
    return
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
/* 撑满列表区高度：字母按可用空间等比分配行高（单项封顶 20px），
   空间不足时自动压缩，避免索引栏整体超高被上下裁剪 */
.contact-alphabet-nav {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4px 0;
  user-select: none;
  z-index: 10;
}

.contact-alphabet-nav__item {
  flex: 1 1 0;
  min-height: 0;
  max-height: 20px;
  width: 16px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--uikit-font-size-10);
  font-weight: var(--uikit-font-weight-medium);
  line-height: 1;
  color: var(--uikit-text-tertiary);
  cursor: pointer;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .contact-alphabet-nav__item:hover {
    color: var(--uikit-text-secondary);
  }
}

/* 当前分组高亮：主色圆角块 + 白字（设计稿：10px/500，与默认档同字号字重） */
.contact-alphabet-nav__item.is-active {
  color: var(--uikit-text-inverse, #fff);
  font-size: var(--uikit-font-size-10);
  font-weight: var(--uikit-font-weight-medium);
  background-color: var(--uikit-primary-color);
  border-radius: var(--uikit-components-radius, 8px);
}

.contact-alphabet-nav__item.is-empty {
  opacity: 0.45;
  cursor: default;
}

@media (hover: hover) {
  .contact-alphabet-nav__item.is-empty:hover {
    color: var(--uikit-text-tertiary);
  }
}
</style>
