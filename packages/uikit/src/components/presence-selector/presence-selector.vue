<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import Icon from '../icon/icon.vue'
import Input from '../input/input.vue'
import Cell from '../cell/cell.vue'

export type PresenceSelectorValue = 'online' | 'busy' | 'away' | 'custom'

export interface PresenceSelectorProps {
  /** 当前自定义状态文本 */
  value?: string
  /** 是否允许自定义状态，默认 true */
  showCustom?: boolean
  /** 自定义状态输入框占位符 */
  customPlaceholder?: string
}

const props = withDefaults(defineProps<PresenceSelectorProps>(), {
  showCustom: true,
})

const emit = defineEmits<{
  (e: 'select', status: PresenceSelectorValue, ext: string): void
  (e: 'cancel'): void
}>()

const { t } = useLocale()

interface PresenceOption {
  key: PresenceSelectorValue
  label: string
  ext: string
  color: string
}

const options = computed<PresenceOption[]>(() => {
  const list: PresenceOption[] = [
    { key: 'online', label: t('presence.online') || '在线', ext: '', color: 'var(--uikit-success-color, #22c55e)' },
    { key: 'busy', label: t('presence.busy') || '忙碌', ext: 'busy', color: 'var(--uikit-danger-color, #ef4444)' },
    { key: 'away', label: t('presence.away') || '离开', ext: 'away', color: 'var(--uikit-warning-color, #f59e0b)' },
  ]
  if (props.showCustom) {
    list.push({
      key: 'custom',
      label: t('presence.custom') || '自定义',
      ext: props.value || '',
      color: 'var(--uikit-text-tertiary, #94a3b8)',
    })
  }
  return list
})

const customText = ref(props.value || '')
const selectedKey = ref<PresenceSelectorValue | null>(null)

watch(() => props.value, (v) => {
  customText.value = v || ''
  // 外部值变化时重置手动选择态，避免旧状态残留
  selectedKey.value = null
})

function isActive(option: PresenceOption): boolean {
  if (selectedKey.value)
    return selectedKey.value === option.key
  // 未手动选择时，按当前 ext 匹配
  const current = (props.value || '').toLowerCase()
  if (option.key === 'online')
    return current === ''
  if (option.key === 'custom')
    return current !== '' && current !== 'busy' && current !== 'away'
  return current === option.ext.toLowerCase()
}

function onSelect(option: PresenceOption) {
  // 立即更新选中态，避免等待 presence 事件回传期间自定义项仍被勾选
  selectedKey.value = option.key
  if (option.key === 'custom') {
    return
  }
  emit('select', option.key, option.ext)
}

function onConfirmCustom() {
  const text = customText.value.trim()
  selectedKey.value = null
  emit('select', 'custom', text)
}

function onCancel() {
  selectedKey.value = null
  emit('cancel')
}
</script>

<template>
  <div class="presence-selector">
    <div class="presence-selector__header">
      <span class="presence-selector__title">{{ t('presence.setStatus') || '设置在线状态' }}</span>
      <button class="presence-selector__close" @click="onCancel">
        <Icon name="actions/xmark_thick" :size="16" />
      </button>
    </div>

    <div class="presence-selector__options">
      <Cell
        v-for="option in options"
        :key="option.key"
        class="presence-selector__option"
        size="compact"
        :active="isActive(option)"
        @click="onSelect(option)"
      >
        <template #leading>
          <span class="presence-selector__dot" :style="{ backgroundColor: option.color }" />
        </template>
        <template #default>{{ option.label }}</template>
        <template #trailing>
          <Icon
            v-if="isActive(option)"
            name="actions/check"
            :size="16"
            class="presence-selector__check"
          />
        </template>
      </Cell>
    </div>

    <div v-if="selectedKey === 'custom'" class="presence-selector__custom">
      <Input
        v-model="customText"
        :placeholder="props.customPlaceholder || (t('presence.customPlaceholder') || '请输入自定义状态')"
        :maxlength="32"
      />
      <button class="presence-selector__confirm" @click="onConfirmCustom">
        {{ t('button.confirm') || '确定' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.presence-selector {
  width: 280px;
  max-width: calc(100vw - 32px);
  padding: 16px;
}

.presence-selector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.presence-selector__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.presence-selector__close {
  background: none;
  border: none;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin: -4px -8px -4px 0;
}

.presence-selector__options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.presence-selector__option {
  --uikit-item-hover-padding-x: 12px;
}

.presence-selector__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.presence-selector__label {
  flex: 1;
  font-size: 14px;
  color: var(--uikit-text-primary);
}

.presence-selector__check {
  color: var(--uikit-primary-color, #3b82f6);
  flex-shrink: 0;
}

.presence-selector__custom {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.presence-selector__confirm {
  align-self: flex-end;
  padding: 8px 16px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-primary-color, #3b82f6);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.presence-selector__confirm:hover {
  opacity: 0.9;
}
</style>
