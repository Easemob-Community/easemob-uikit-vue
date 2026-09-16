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
   medium 36×20 / small 28×16；手柄直径 = 轨道高 - 2×内边距（设计稿 medium 14 / small 12），
   hover/pressed 手柄放大一档（medium 16 / small 14），pressed 再沿滑动方向伸长 */
.uikit-switch {
  --switch-handle-inset: 3px;
  --switch-handle-inset-active: 2px;
  /* 按压态手柄沿滑动方向伸长量（设计稿 Pressed 态） */
  --switch-handle-grow: 6px;
  /* hover/pressed 态手柄外圈状态层光圈宽度（设计稿光圈外径 28 / 放大后手柄 16） */
  --switch-halo: 6px;
  --switch-track-w: var(--uikit-switch-track-w, 36px);
  --switch-track-h: var(--uikit-switch-track-h, 20px);
  --switch-handle-size: calc(var(--switch-track-h) - 2 * var(--switch-handle-inset));
  --switch-handle-size-active: calc(var(--switch-track-h) - 2 * var(--switch-handle-inset-active));

  position: relative;
  width: var(--switch-track-w);
  height: var(--switch-track-h);
  padding: 0;
  border: none;
  border-radius: calc(var(--switch-track-h) / 2);
  background-color: var(--uikit-switch-off-bg, #e3e6e8);
  cursor: pointer;
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    box-shadow var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-switch--small {
  --switch-handle-inset: 2px;
  --switch-handle-inset-active: 1px;
  --switch-handle-grow: 4px;
  --switch-halo: 4px;
  --switch-track-w: var(--uikit-switch-small-track-w, 28px);
  --switch-track-h: var(--uikit-switch-small-track-h, 16px);
}

.uikit-switch--checked {
  background-color: var(--uikit-switch-on-bg, #009eff);
}

/* Hover / Pressed 轨道反馈：轨道色不变，叠内阴影（设计稿 inner shadow） */
@media (hover: hover) {
  .uikit-switch:hover:not(:disabled) {
    box-shadow: var(--uikit-switch-track-inner-shadow, inset 0 4px 2px rgba(0, 0, 0, 0.1));
  }
}

.uikit-switch:active:not(:disabled) {
  box-shadow: var(--uikit-switch-track-inner-shadow, inset 0 4px 2px rgba(0, 0, 0, 0.1));
}

.uikit-switch:focus-visible {
  outline: 2px solid var(--uikit-primary-color);
  outline-offset: 2px;
}

/* Disabled：off 为描边空轨 + 灰色手柄；on 为品牌蓝浅轨 + 白手柄（均无落影，设计稿） */
.uikit-switch:disabled {
  background-color: transparent;
  box-shadow: inset 0 0 0 1px var(--uikit-switch-off-bg, #e3e6e8);
  cursor: not-allowed;
}

.uikit-switch--checked:disabled {
  background-color: var(--uikit-switch-on-disabled-bg, #ccecff);
  box-shadow: none;
}

/* 手柄：圆形手柄 + 1px 描边 + 双层落影（颜色走 --uikit-switch-handle-bg token，浅白暗深）；
   hover/pressed 放大，pressed 沿滑动方向伸长。
   off 锚定左侧、on 锚定右侧（用 left 计算值保证放大/伸长方向朝向轨道空余侧） */
.uikit-switch__handle {
  position: absolute;
  top: 50%;
  left: var(--switch-handle-inset);
  translate: 0 -50%;
  width: var(--switch-handle-size);
  height: var(--switch-handle-size);
  border-radius: calc(var(--switch-track-h) / 2);
  background-color: var(--uikit-switch-handle-bg, var(--uikit-text-inverse));
  /* 双层落影 + 1px 描边 + 状态层光圈（默认 0 宽度，hover/pressed 展开） */
  box-shadow:
    var(--uikit-switch-handle-shadow, 0 1px 3px rgba(70, 78, 83, 0.15), 0 1px 2px rgba(23, 26, 28, 0.1)),
    inset 0 0 0 1px var(--uikit-switch-handle-ring, #f1f2f3),
    0 0 0 0 var(--uikit-switch-halo-off, rgba(0, 0, 0, 0.05));
  transition:
    left var(--uikit-anim-duration) var(--uikit-anim-easing),
    width var(--uikit-anim-duration) var(--uikit-anim-easing),
    height var(--uikit-anim-duration) var(--uikit-anim-easing),
    box-shadow var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-switch--checked .uikit-switch__handle {
  left: calc(100% - var(--switch-handle-size) - var(--switch-handle-inset));
}

/* hover/pressed 手柄放大 + 状态层光圈：off 态为中性灰光圈，on 态为主色浅蓝光晕。
   放大围绕手柄中心进行（left 同步内收一档），pressed 的伸长朝向轨道空余侧 */
@media (hover: hover) {
  .uikit-switch:hover:not(:disabled) .uikit-switch__handle {
    left: var(--switch-handle-inset-active);
    width: var(--switch-handle-size-active);
    height: var(--switch-handle-size-active);
    box-shadow:
      var(--uikit-switch-handle-shadow, 0 1px 3px rgba(70, 78, 83, 0.15), 0 1px 2px rgba(23, 26, 28, 0.1)),
      inset 0 0 0 1px var(--uikit-switch-handle-ring, #f1f2f3),
      0 0 0 var(--switch-halo) var(--uikit-switch-halo-off, rgba(0, 0, 0, 0.05));
  }

  .uikit-switch--checked:hover:not(:disabled) .uikit-switch__handle {
    left: calc(100% - var(--switch-handle-size-active) - var(--switch-handle-inset-active));
    box-shadow:
      var(--uikit-switch-handle-shadow, 0 1px 3px rgba(70, 78, 83, 0.15), 0 1px 2px rgba(23, 26, 28, 0.1)),
      inset 0 0 0 1px var(--uikit-switch-handle-ring, #f1f2f3),
      0 0 0 var(--switch-halo) var(--uikit-switch-halo-on);
  }
}

.uikit-switch:active:not(:disabled) .uikit-switch__handle {
  left: var(--switch-handle-inset-active);
  width: calc(var(--switch-handle-size-active) + var(--switch-handle-grow));
  height: var(--switch-handle-size-active);
  box-shadow:
    var(--uikit-switch-handle-shadow, 0 1px 3px rgba(70, 78, 83, 0.15), 0 1px 2px rgba(23, 26, 28, 0.1)),
    inset 0 0 0 1px var(--uikit-switch-handle-ring, #f1f2f3),
    0 0 0 var(--switch-halo) var(--uikit-switch-halo-off, rgba(0, 0, 0, 0.05));
}

.uikit-switch--checked:active:not(:disabled) .uikit-switch__handle {
  left: calc(100% - var(--switch-handle-size-active) - var(--switch-handle-grow) - var(--switch-handle-inset-active));
  box-shadow:
    var(--uikit-switch-handle-shadow, 0 1px 3px rgba(70, 78, 83, 0.15), 0 1px 2px rgba(23, 26, 28, 0.1)),
    inset 0 0 0 1px var(--uikit-switch-handle-ring, #f1f2f3),
    0 0 0 var(--switch-halo) var(--uikit-switch-halo-on);
}

/* Disabled 手柄：off 灰 / on 白，去掉落影、描边与光圈 */
.uikit-switch:disabled .uikit-switch__handle {
  background-color: var(--uikit-switch-off-bg, #e3e6e8);
  box-shadow: none;
}

.uikit-switch--checked:disabled .uikit-switch__handle {
  background-color: var(--uikit-text-inverse);
}
</style>
