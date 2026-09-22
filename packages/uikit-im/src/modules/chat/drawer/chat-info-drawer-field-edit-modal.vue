<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { EmPopup as Popup } from '@easemob-community/uikit-core'
import { EmButton as Button } from '@easemob-community/uikit-core'
import { EmInput as Input } from '@easemob-community/uikit-core'
import { useLocale } from '@easemob-community/uikit-core'

export interface ChatInfoDrawerFieldEditModalProps {
  /** 是否显示（v-model:show 受控） */
  show: boolean
  /** 弹窗标题 */
  title: string
  /** 初始值（打开时同步到内部输入态） */
  value: string
  /** 最大长度 */
  maxLength: number
  /** 多行模式（textarea），默认 false（input 单行） */
  multiline?: boolean
  /** 保存中（禁用保存按钮并显示 loading） */
  saving?: boolean
}

const props = withDefaults(defineProps<ChatInfoDrawerFieldEditModalProps>(), {
  multiline: false,
  saving: false,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  /** 点击保存，负载为当前输入值；由父组件执行异步保存并关闭弹窗 */
  (e: 'save', value: string): void
  (e: 'cancel'): void
}>()

const { t } = useLocale()

const input = ref('')
const inputRef = ref<InstanceType<typeof Input>>()
const textareaRef = ref<HTMLTextAreaElement>()

function formatCharCount(current: number, max: number): string {
  return t('common.charCount', '{current}/{max}').replace('{current}', String(current)).replace('{max}', String(max))
}

watch(
  () => props.show,
  async (show) => {
    if (show) {
      input.value = props.value
      await nextTick()
      if (props.multiline)
        textareaRef.value?.focus()
      else
        inputRef.value?.inputRef?.focus()
    }
  },
)

function onCancel() {
  emit('cancel')
  emit('update:show', false)
}

function onSave() {
  if (props.saving)
    return
  emit('save', input.value)
}
</script>

<template>
  <Popup
    :show="props.show"
    position="center"
    @update:show="emit('update:show', $event)"
    @close="onCancel"
  >
    <div class="chat-info-drawer-field-edit">
      <div class="chat-info-drawer-field-edit__title">
        {{ props.title }}
      </div>
      <div class="chat-info-drawer-field-edit__body">
        <textarea
          v-if="props.multiline"
          ref="textareaRef"
          v-model="input"
          class="chat-info-drawer-field-edit__textarea"
          rows="3"
          :maxlength="props.maxLength"
          @keydown.esc="onCancel"
        />
        <Input
          v-else
          ref="inputRef"
          v-model="input"
          :maxlength="props.maxLength"
          @submit="onSave"
          @keydown.esc="onCancel"
        />
        <div
          class="chat-info-drawer-field-edit__char-count"
          :class="{ 'is-near-limit': input.length > props.maxLength * 0.9 }"
        >
          {{ formatCharCount(input.length, props.maxLength) }}
        </div>
      </div>
      <div class="chat-info-drawer-field-edit__footer">
        <Button type="default" @click="onCancel">
          {{ t('button.cancel', '取消') }}
        </Button>
        <Button type="primary" :loading="props.saving" :disabled="props.saving" @click="onSave">
          {{ t('chat.info.save', '保存') }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.chat-info-drawer-field-edit {
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
}

.chat-info-drawer-field-edit__title {
  padding: 16px 16px 8px;
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-semibold);
  text-align: center;
  color: var(--uikit-text-primary);
}

.chat-info-drawer-field-edit__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px;
}

.chat-info-drawer-field-edit__textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--uikit-border-color);
  /* 多行输入圆角跟随主题组件档位（themeStore 写 --uikit-components-radius：ground 8px / square 4px） */
  border-radius: var(--uikit-components-radius, 8px);
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-13);
  line-height: 1.5;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
}

.chat-info-drawer-field-edit__textarea:focus {
  border-color: var(--uikit-primary-color);
}

.chat-info-drawer-field-edit__char-count {
  align-self: flex-end;
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-tertiary);
  line-height: 1;
}

.chat-info-drawer-field-edit__char-count.is-near-limit {
  color: var(--uikit-warning-color, var(--uikit-error-color));
}

.chat-info-drawer-field-edit__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px 16px;
}
</style>
