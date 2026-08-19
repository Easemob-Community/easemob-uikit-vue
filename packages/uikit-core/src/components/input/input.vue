<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '../../store/theme'
import Icon from '../icon/icon.vue'

export interface InputProps {
  /** 输入框当前值（v-model 绑定） */
  modelValue?: string
  /** 占位提示文案，无输入时显示 */
  placeholder?: string
  /** 原生输入类型：text 文本 / password 密码 / number 数字，默认 'text' */
  type?: 'text' | 'password' | 'number'
  /** 是否禁用输入 */
  disabled?: boolean
  /** 最大可输入字符数，超出后无法继续输入 */
  maxlength?: number
  /** 前缀图标名称，格式 "category/icon-name"，如 "search" */
  prefixIcon?: string
  /**
   * 是否显示清除按钮（有输入内容时右侧出现）。
   * 默认清除图标为 `xmark/light`，搜索场景可传 `clear-icon="search/xmark"`。
   */
  clearable?: boolean
  /** 清除按钮图标名称，默认 "xmark/light" */
  clearIcon?: string
  /** 是否处于错误状态；为 true 时边框变红并显示错误图标 */
  error?: boolean
  /** 错误提示文案；传入时显示在输入框下方 */
  errorMessage?: string
  /** 错误图标名称，默认 "status/info" */
  errorIcon?: string
  /** 是否只读；只读时背景置灰但文字仍可选中复制 */
  readonly?: boolean
  /**
   * 输入框风格变体
   * - 'default': 白色背景 + 边框 + 圆角，适用于表单输入（默认）
   * - 'search': 白底 + 底部细线，适用于搜索框
   * - 'filled': 灰色背景 + 无边框 + 圆角，旧搜索风格
   * - 'ghost': 完全透明 + 聚焦时底部细线，极简风格
   * - 'underline': 无背景 + 仅底部一条线，最极简
   */
  variant?: 'default' | 'search' | 'filled' | 'ghost' | 'underline'
}

export interface InputEmits {
  /** 输入内容变化时触发，负载为最新输入值，供 v-model 双向同步 */
  (e: 'update:modelValue', value: string): void
  /** 输入事件，负载为原生 input 事件对象（与 update:modelValue 同时触发） */
  (e: 'input', event: Event): void
  /** 输入框获得焦点时触发，负载为原生 focus 事件 */
  (e: 'focus', event: FocusEvent): void
  /** 输入框失去焦点时触发，负载为原生 blur 事件 */
  (e: 'blur', event: FocusEvent): void
  /** 按下回车（非 Shift+Enter）时触发，负载为当前输入值，常用于搜索/提交 */
  (e: 'submit', value: string): void
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  variant: 'default',
  clearable: false,
  clearIcon: 'xmark/light',
  error: false,
  errorMessage: '',
  errorIcon: 'status/info',
  readonly: false,
})

const emit = defineEmits<InputEmits>()
const inputRef = ref<HTMLInputElement | null>(null)

const themeStore = useThemeStore()
const shapeClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'uikit-input__field--square' : '',
)

const variantClass = computed(() => {
  if (props.variant === 'search')
    return 'uikit-input__field--search'
  if (props.variant === 'filled')
    return 'uikit-input__field--filled'
  if (props.variant === 'ghost')
    return 'uikit-input__field--ghost'
  if (props.variant === 'underline')
    return 'uikit-input__field--underline'
  return ''
})

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', e)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit', props.modelValue)
  }
}

/** 清除输入内容并聚焦 */
function onClear() {
  emit('update:modelValue', '')
  emit('input', new Event('input'))
  inputRef.value?.focus()
}

defineExpose({
  inputRef,
})
</script>

<template>
  <div
    class="uikit-input"
    :class="{
      'uikit-input--with-prefix': props.prefixIcon,
      'uikit-input--with-clear': props.clearable && !props.error,
      'uikit-input--with-error': props.error,
      'uikit-input--with-error-message': props.errorMessage,
      'uikit-input--search': props.variant === 'search',
      'uikit-input--filled': props.variant === 'filled',
      'uikit-input--ghost': props.variant === 'ghost',
      'uikit-input--underline': props.variant === 'underline',
      'uikit-input--readonly': props.readonly,
    }"
  >
    <div class="uikit-input__row">
      <Icon
        v-if="props.prefixIcon"
        :name="props.prefixIcon"
        :size="16"
        class="uikit-input__prefix-icon"
      />
      <input
        ref="inputRef"
        class="uikit-input__field"
        :class="[shapeClass, variantClass]"
        :value="props.modelValue"
        :type="props.type"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :maxlength="props.maxlength"
        @input="onInput"
        @focus="(e: FocusEvent) => emit('focus', e)"
        @blur="(e: FocusEvent) => emit('blur', e)"
        @keydown="onKeydown"
      >
      <button
        v-if="props.error"
        type="button"
        class="uikit-input__error-icon"
        tabindex="-1"
        aria-hidden="true"
      >
        <Icon :name="props.errorIcon" :size="14" />
      </button>
      <button
        v-else-if="props.clearable && props.modelValue"
        type="button"
        class="uikit-input__clear"
        title="clear"
        @click="onClear"
      >
        <Icon :name="props.clearIcon" :size="14" />
      </button>
    </div>
    <div v-if="props.errorMessage" class="uikit-input__error-message">
      {{ props.errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.uikit-input {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.uikit-input__row {
  display: flex;
  width: 100%;
  position: relative;
}

.uikit-input--with-prefix .uikit-input__field {
  padding-left: 36px;
}

/* 可清除：右侧留出清除按钮空间 */
.uikit-input--with-clear .uikit-input__field {
  padding-right: 32px;
}

/* 错误态：右侧留出错误图标空间 */
.uikit-input--with-error .uikit-input__field {
  padding-right: 32px;
}

.uikit-input__clear,
.uikit-input__error-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  padding: 0;
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.uikit-input__error-icon {
  background-color: transparent;
  color: var(--uikit-danger-color);
  cursor: default;
}

@media (hover: hover) {
  .uikit-input__clear:hover {
    background-color: var(--uikit-bg-hover);
    color: var(--uikit-text-primary);
  }
}

.uikit-input__prefix-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--uikit-text-secondary);
  pointer-events: none;
}

.uikit-input__field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--uikit-border-color);
  border-radius: var(--uikit-components-radius);
  font-size: var(--uikit-font-size-14);
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  transition:
    border-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

/* 移动端 iOS 对 <16px 输入框 focus 自动缩放，放大到 16px 规避（平铺 @media，避免嵌套写法被 esbuild 警告/浏览器丢弃） */
@media (hover: none), (max-width: 767px) {
  .uikit-input__field {
    font-size: var(--uikit-font-size-16);
  }
}

/* search/filled 变体：与列表 Cell 的 16px 水平内边距对齐 */
.uikit-input--search .uikit-input__field,
.uikit-input--filled .uikit-input__field {
  padding: 8px 16px;
}

.uikit-input--search.uikit-input--with-prefix .uikit-input__field,
.uikit-input--filled.uikit-input--with-prefix .uikit-input__field {
  padding-left: 40px;
}

.uikit-input--search .uikit-input__prefix-icon,
.uikit-input--filled .uikit-input__prefix-icon {
  left: 16px;
}

.uikit-input__field--square {
  border-radius: 4px;
}

.uikit-input__field:focus {
  border-color: var(--uikit-primary-color);
}

/* Error 状态：边框变红 */
.uikit-input--with-error .uikit-input__field {
  border-color: var(--uikit-danger-color);
}

.uikit-input--with-error .uikit-input__field:focus {
  border-color: var(--uikit-danger-color);
}

/* Readonly 状态：灰底但文字可选中 */
.uikit-input--readonly .uikit-input__field {
  background-color: var(--uikit-bg-secondary);
  cursor: default;
}

.uikit-input__error-message {
  margin-top: 4px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-danger-color);
  line-height: 1.4;
}

/* Search 风格：灰色背景 + 无边框 + 圆角 + 聚焦光环（飞书风格） */
.uikit-input__field--search {
  background-color: var(--uikit-bg-secondary);
  border-color: transparent;
}

.uikit-input__field--search:focus {
  border-color: transparent;
  background-color: var(--uikit-bg-secondary);
  box-shadow: 0 0 0 2px var(--uikit-primary-color-opacity);
}

.uikit-input--search .uikit-input__prefix-icon {
  color: var(--uikit-text-secondary);
  left: 4px;
}

/* Filled 风格：灰色背景 + 无边框 + 圆角 */
.uikit-input__field--filled {
  background-color: var(--uikit-bg-secondary);
  border-color: transparent;
}

.uikit-input__field--filled:focus {
  border-color: transparent;
  background-color: var(--uikit-bg-secondary);
  box-shadow: none;
}

.uikit-input--filled .uikit-input__prefix-icon {
  color: var(--uikit-text-secondary);
  left: 4px;
}

/* Ghost 风格：完全透明 + 聚焦时底部细线 */
.uikit-input__field--ghost {
  background-color: transparent;
  border-color: transparent;
  border-radius: 0;
}

.uikit-input__field--ghost:focus {
  border-color: transparent;
  border-bottom: 1px solid var(--uikit-primary-color);
  background-color: transparent;
  box-shadow: none;
}

.uikit-input--ghost .uikit-input__prefix-icon {
  color: var(--uikit-text-secondary);
  left: 4px;
}

/* Underline 风格：无背景 + 仅底部一条线 */
.uikit-input__field--underline {
  background-color: transparent;
  border-color: transparent;
  border-bottom: 1px solid var(--uikit-divider-color);
  border-radius: 0;
}

.uikit-input__field--underline:focus {
  border-color: transparent;
  border-bottom-color: var(--uikit-primary-color);
  background-color: transparent;
  box-shadow: none;
}

.uikit-input--underline .uikit-input__prefix-icon {
  color: var(--uikit-text-secondary);
  left: 4px;
}

/* Error 状态：各变体差异化呈现 */
.uikit-input--with-error .uikit-input__field--search,
.uikit-input--with-error .uikit-input__field--search:focus {
  box-shadow: 0 0 0 2px rgba(var(--uikit-danger-rgb), 0.25);
}

.uikit-input--with-error .uikit-input__field--filled,
.uikit-input--with-error .uikit-input__field--filled:focus {
  border-color: rgba(var(--uikit-danger-rgb), 0.5);
}

.uikit-input--with-error .uikit-input__field--ghost,
.uikit-input--with-error .uikit-input__field--ghost:focus,
.uikit-input--with-error .uikit-input__field--underline,
.uikit-input--with-error .uikit-input__field--underline:focus {
  border-bottom-color: var(--uikit-danger-color);
}

.uikit-input__field::placeholder {
  color: var(--uikit-text-secondary);
}

.uikit-input__field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
