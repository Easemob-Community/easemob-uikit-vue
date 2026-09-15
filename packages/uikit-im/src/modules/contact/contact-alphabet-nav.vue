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
      <span class="contact-alphabet-nav__label">{{ key }}</span>
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
  width: 18px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--uikit-font-size-11);
  line-height: 1;
  color: var(--uikit-primary-color);
  cursor: pointer;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .contact-alphabet-nav__item:hover {
    color: var(--uikit-primary-hover);
  }
}

/* 大写字母无下伸部（descender），line-height: 1 居中的是 em 框，
   字形在框内光学上偏高；给文本层一个固定的向下补偿，保证在激活圆盘内视觉居中 */
.contact-alphabet-nav__label {
  transform: translateY(0.5px);
}

/* 当前分组高亮：设计稿为蓝底白字实心圆点（16×16）；
   圆盘用伪元素显式居中，行高被压缩时仍保持正圆 */
.contact-alphabet-nav__item.is-active {
  color: var(--uikit-text-inverse);
  font-weight: 600;
}

.contact-alphabet-nav__item.is-active::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--uikit-primary-color);
  z-index: -1;
}

.contact-alphabet-nav__item.is-active:active::before {
  filter: brightness(0.85);
}

.contact-alphabet-nav__item.is-empty {
  color: var(--uikit-text-tertiary, #c0c4cc);
  cursor: default;
}

@media (hover: hover) {
  .contact-alphabet-nav__item.is-empty:hover {
    color: var(--uikit-text-tertiary, #c0c4cc);
  }
}
</style>
