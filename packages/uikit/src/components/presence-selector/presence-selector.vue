<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import Icon from '../icon/icon.vue'
import IconButton from '../icon-button/icon-button.vue'
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
  /** 紧凑模式，popup 场景下更窄的宽度与更小的内边距 */
  compact?: boolean
  /** 是否展示标题头部，默认 true */
  showHeader?: boolean
  /** 自定义状态是否使用独立 Modal 输入，默认 false（保持 inline 输入） */
  useCustomModal?: boolean
}

const props = withDefaults(defineProps<PresenceSelectorProps>(), {
  showCustom: true,
  compact: false,
  showHeader: true,
  useCustomModal: false,
})

const emit = defineEmits<{
  (e: 'select', status: PresenceSelectorValue, ext: string): void
  (e: 'cancel'): void
  (e: 'custom-click'): void
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
    if (props.useCustomModal) {
      emit('custom-click')
    }
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
  <div class="presence-selector" :class="{ 'presence-selector--compact': props.compact }">
    <div v-if="props.showHeader" class="presence-selector__header">
      <span class="presence-selector__title">{{ t('presence.setStatus') || '设置在线状态' }}</span>
      <IconButton
        class="presence-selector__close"
        icon="actions/close"
        size="small"
        variant="ghost"
        :title="t('button.close') || '关闭'"
        @click="onCancel"
      />
    </div>

    <div class="presence-selector__options" :class="{ 'presence-selector__options--no-header': !props.showHeader }">
      <Cell
        v-for="option in options"
        :key="option.key"
        class="presence-selector__option"
        size="compact"
        :title="option.label"
        :active="isActive(option)"
        @click="onSelect(option)"
      >
        <template #leading>
          <span class="presence-selector__dot" :style="{ backgroundColor: option.color }" />
        </template>
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

    <div v-if="selectedKey === 'custom' && !props.useCustomModal" class="presence-selector__custom">
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

.presence-selector--compact {
  width: 140px;
  padding: 4px;
}

.presence-selector--compact .presence-selector__title {
  font-size: 14px;
}

.presence-selector--compact .presence-selector__dot {
  width: 8px;
  height: 8px;
}

.presence-selector--compact .presence-selector__options {
  gap: 2px;
}

.presence-selector--compact .presence-selector__options--no-header {
  margin-top: 0;
}

.presence-selector--compact .presence-selector__option {
  --uikit-item-hover-padding-x: 0px;
}

.presence-selector--compact .presence-selector__option :deep(.uikit-cell) {
  --uikit-cell-height: auto;
  height: auto;
  padding: 10px 12px;
  margin-bottom: 0;
}

.presence-selector--compact .presence-selector__custom {
  margin-top: 8px;
  padding-top: 8px;
}

.presence-selector--compact .presence-selector__confirm {
  padding: 6px 12px;
  font-size: 13px;
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
  flex-shrink: 0;
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
