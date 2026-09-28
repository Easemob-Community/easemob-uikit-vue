<script setup lang="ts">
import { computed, ref } from 'vue'
import { type ContactGroupItem, DEFAULT_ALPHABET_KEYS } from './types'
import { resolveAlphabetKeyByOffsetY } from './alphabet-nav.utils'

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
  /** 点击或滑动命中字母时触发；sliding=true 表示来自按住滑动（连续定位，跳转应瞬时完成） */
  (e: 'jump', key: string, sliding?: boolean): void
}>()

const existKeys = computed(() => {
  if (props.keys && props.keys.length)
    return new Set(props.keys)
  return new Set(props.groups.map(g => g.key))
})

function onTap(key: string, sliding = false) {
  if (props.dimEmpty && !existKeys.value.has(key))
    return
  emit('jump', key, sliding)
}

// ===== 移动端按住滑动连续定位：触点 y 在完整字母序列上按占比映射 =====
const navRef = ref<HTMLElement>()
/** 滑动中标记：touchmove 仅在从索引条起滑时响应，避免列表滚动误入 */
let sliding = false

function keyFromTouch(e: TouchEvent): string | null {
  const el = navRef.value
  const touch = e.touches[0]
  if (!el || !touch)
    return null
  const rect = el.getBoundingClientRect()
  return resolveAlphabetKeyByOffsetY(touch.clientY - rect.top, rect.height, DEFAULT_ALPHABET_KEYS)
}

function onTouchStart(e: TouchEvent) {
  sliding = true
  const key = keyFromTouch(e)
  if (key)
    onTap(key, true)
}

function onTouchMove(e: TouchEvent) {
  if (!sliding)
    return
  const key = keyFromTouch(e)
  if (key)
    onTap(key, true)
}

function onTouchEnd() {
  sliding = false
}
</script>

<template>
  <div
    ref="navRef"
    class="contact-alphabet-nav"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
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
  /* 视觉保持 16px 纤细、触摸热区经 content-box padding 加宽到 24px（≥24px 触控目标）；
     background-clip: content-box 保证 is-active 高亮块仍只覆盖 16px 视觉区 */
  box-sizing: content-box;
  width: 16px;
  padding: 0 4px;
  background-clip: content-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--uikit-font-size-9);
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
  font-size: var(--uikit-font-size-9);
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
