<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../icon/icon.vue'

export interface CheckboxProps {
  /** 是否选中 / Checked state */
  checked?: boolean
  /** 图标尺寸（px），默认 20 / Icon size in px, default 20 */
  size?: number
  /** 是否禁用（仅视觉半透明；点击交互由父级控制）/ Disabled (visual only; interaction is controlled by parent) */
  disabled?: boolean
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  checked: false,
  size: 20,
  disabled: false,
})

const iconName = computed(() => (props.checked ? 'filled/circle/checked' : 'circle/empty'))
</script>

<template>
  <!-- 纯选中指示器：不自带点击逻辑，多选场景由行/容器统一处理点击；
       单根节点下 @click 等原生监听会透传到根元素，需要独立点击时直接挂即可 -->
  <span
    class="uikit-checkbox"
    :class="{
      'uikit-checkbox--checked': props.checked,
      'uikit-checkbox--disabled': props.disabled,
    }"
    role="checkbox"
    :aria-checked="props.checked"
  >
    <Icon :name="iconName" :size="props.size" />
  </span>
</template>

<style scoped>
.uikit-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--uikit-text-tertiary);
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-checkbox--checked {
  color: var(--uikit-primary-color);
}

.uikit-checkbox--disabled {
  opacity: 0.5;
}
</style>
