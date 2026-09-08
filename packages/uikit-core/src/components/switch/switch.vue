<script setup lang="ts">
export interface SwitchProps {
  /** 开关状态（v-model）/ Switch state, used with v-model */
  modelValue?: boolean
  /** 尺寸：medium（默认）/ small / Size: medium (default) or small */
  size?: 'medium' | 'small'
  /** 是否禁用；禁用时不可点击且不触发事件 / Disabled: not clickable and no events fired */
  disabled?: boolean
}

export interface SwitchEmits {
  /** 状态变化时同步 v-model / Fired on toggle to sync v-model */
  (e: 'update:modelValue', value: boolean): void
  /** 状态变化后的业务回调，负载为切换后的新值 / Fired after toggle with the new value */
  (e: 'change', value: boolean): void
}

const props = withDefaults(defineProps<SwitchProps>(), {
  modelValue: false,
  size: 'medium',
  disabled: false,
})

const emit = defineEmits<SwitchEmits>()

function toggle() {
  if (props.disabled)
    return
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="uikit-switch"
    :class="[
      `uikit-switch--${props.size}`,
      { 'uikit-switch--checked': props.modelValue },
    ]"
    :aria-checked="props.modelValue"
    :disabled="props.disabled"
    @click="toggle"
  >
    <span class="uikit-switch__handle" />
  </button>
</template>

<style scoped>
/* 尺寸走全局 token（接入方可覆盖 --uikit-switch-track-* 全局定制宽高）：
   medium 36×20 / small 28×16，边距 2px，手柄尺寸由轨道高自动派生（track-h - 4px） */
.uikit-switch {
  --switch-track-w: var(--uikit-switch-track-w, 36px);
  --switch-track-h: var(--uikit-switch-track-h, 20px);
  --switch-handle-size: calc(var(--switch-track-h) - 4px);
  /* 按压态手柄沿滑动方向伸长量（设计稿 Pressed 态） */
  --switch-handle-grow: 6px;
  /* hover/pressed 态手柄外圈状态层光圈宽度 */
  --switch-halo: 5px;

  position: relative;
  width: var(--switch-track-w);
  height: var(--switch-track-h);
  padding: 0;
  border: none;
  border-radius: calc(var(--switch-track-h) / 2);
  background-color: var(--uikit-switch-off-bg, #C9CDCF);
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-switch--small {
  --switch-track-w: var(--uikit-switch-small-track-w, 28px);
  --switch-track-h: var(--uikit-switch-small-track-h, 16px);
  --switch-handle-grow: 4px;
  --switch-halo: 4px;
}

.uikit-switch--checked {
  background-color: var(--uikit-primary-color);
}

/* Hover / Pressed 轨道反馈：off 态加深灰（派生 token），on 态走 primary-hover */
@media (hover: hover) {
  .uikit-switch:hover:not(:disabled) {
    background-color: var(--uikit-switch-off-hover-bg, #B4BABF);
  }

  .uikit-switch--checked:hover:not(:disabled) {
    background-color: var(--uikit-primary-hover);
  }
}

.uikit-switch:active:not(:disabled) {
  background-color: var(--uikit-switch-off-hover-bg, #B4BABF);
}

.uikit-switch--checked:active:not(:disabled) {
  background-color: var(--uikit-primary-hover);
}

.uikit-switch:focus-visible {
  outline: 2px solid var(--uikit-primary-color);
  outline-offset: 2px;
}

.uikit-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 手柄：白色圆形，按压时沿滑动方向伸长（Pressed 态）。
   off 锚定左侧、on 锚定右侧（用 left 计算值保证伸长方向朝向轨道空余侧） */
.uikit-switch__handle {
  position: absolute;
  top: 50%;
  left: 2px;
  translate: 0 -50%;
  width: var(--switch-handle-size);
  height: var(--switch-handle-size);
  border-radius: calc(var(--switch-handle-size) / 2);
  background-color: var(--uikit-text-inverse);
  /* 双层阴影：贴近手柄的落影 + 状态层光圈（默认 0 宽度，hover/pressed 展开） */
  box-shadow:
    var(--uikit-shadow-sm),
    0 0 0 0 var(--uikit-primary-soft, transparent);
  transition:
    left var(--uikit-anim-duration) var(--uikit-anim-easing),
    width var(--uikit-anim-duration) var(--uikit-anim-easing),
    box-shadow var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-switch--checked .uikit-switch__handle {
  left: calc(100% - var(--switch-handle-size) - 2px);
}

/* hover/pressed 状态层光圈：off 态为灰色光晕（由关闭态轨道色派生），on 态为主色浅蓝光晕 */
@media (hover: hover) {
  .uikit-switch:hover:not(:disabled) .uikit-switch__handle {
    box-shadow:
      var(--uikit-shadow-sm),
      0 0 0 var(--switch-halo) color-mix(in srgb, var(--uikit-switch-off-bg, #C9CDCF) 40%, transparent);
  }

  .uikit-switch--checked:hover:not(:disabled) .uikit-switch__handle {
    box-shadow:
      var(--uikit-shadow-sm),
      0 0 0 var(--switch-halo) var(--uikit-primary-soft);
  }
}

.uikit-switch:active:not(:disabled) .uikit-switch__handle {
  width: calc(var(--switch-handle-size) + var(--switch-handle-grow));
  box-shadow:
    var(--uikit-shadow-sm),
    0 0 0 var(--switch-halo) color-mix(in srgb, var(--uikit-switch-off-bg, #C9CDCF) 40%, transparent);
}

.uikit-switch--checked:active:not(:disabled) .uikit-switch__handle {
  left: calc(100% - var(--switch-handle-size) - var(--switch-handle-grow) - 2px);
  box-shadow:
    var(--uikit-shadow-sm),
    0 0 0 var(--switch-halo) var(--uikit-primary-soft);
}
</style>
