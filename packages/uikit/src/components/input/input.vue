<script setup lang="ts">
import { ref, computed } from 'vue'
import { useThemeStore } from '../../store/theme'
import Icon from '../icon/icon.vue'

export interface InputProps {
  modelValue?: string
  placeholder?: string
  type?: 'text' | 'password' | 'number'
  disabled?: boolean
  maxlength?: number
  rows?: number
  /** 前缀图标名称，格式 "category/icon-name"，如 "misc/magnifier2" */
  prefixIcon?: string
}

export interface InputEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'input', event: Event): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'submit', value: string): void
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
})

const emit = defineEmits<InputEmits>()
const inputRef = ref<HTMLInputElement | null>(null)

const themeStore = useThemeStore()
const shapeClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'uikit-input__field--square' : ''
)

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

defineExpose({
  inputRef,
})
</script>

<template>
  <div class="uikit-input" :class="{ 'uikit-input--with-prefix': props.prefixIcon }">
    <Icon
      v-if="props.prefixIcon"
      :name="props.prefixIcon"
      :size="16"
      class="uikit-input__prefix-icon"
    />
    <input
      ref="inputRef"
      class="uikit-input__field"
      :class="shapeClass"
      :value="props.modelValue"
      :type="props.type"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :maxlength="props.maxlength"
      @input="onInput"
      @focus="(e: FocusEvent) => emit('focus', e)"
      @blur="(e: FocusEvent) => emit('blur', e)"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.uikit-input {
  display: flex;
  width: 100%;
  position: relative;
}

.uikit-input--with-prefix .uikit-input__field {
  padding-left: 36px;
}

.uikit-input__prefix-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--uikit-text-secondary, #9ca3af);
  pointer-events: none;
}

.uikit-input__field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  transition: border-color 0.2s;
}

.uikit-input__field--square {
  border-radius: 4px;
}

.uikit-input__field:focus {
  border-color: var(--uikit-primary-color);
}

.uikit-input__field::placeholder {
  color: var(--uikit-text-secondary);
}

.uikit-input__field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
