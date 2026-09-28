<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { EmInput as Input, EmModal as Modal, useLocale } from '@easemob-community/uikit-core'

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
  <!-- 壳已收敛到 EmModal（D133）：自带移动端 bottom sheet 回落与 safe-bottom，
       确认不自动关闭（confirmAutoClose=false），由父组件保存成功后关闭 -->
  <Modal
    :show="props.show"
    :title="props.title"
    :width="400"
    body-flush
    :confirm-text="t('chat.info.save', '保存')"
    :confirm-loading="props.saving"
    :confirm-disabled="props.saving"
    :confirm-auto-close="false"
    @update:show="emit('update:show', $event)"
    @confirm="onSave"
    @cancel="onCancel"
  >
    <div class="chat-info-drawer-field-edit__body">
      <textarea
        v-if="props.multiline"
        ref="textareaRef"
        v-model="input"
        class="chat-info-drawer-field-edit__textarea"
        rows="3"
        :maxlength="props.maxLength"
      />
      <Input
        v-else
        ref="inputRef"
        v-model="input"
        :maxlength="props.maxLength"
        @submit="onSave"
      />
      <div
        class="chat-info-drawer-field-edit__char-count"
        :class="{ 'is-near-limit': input.length > props.maxLength * 0.9 }"
      >
        {{ formatCharCount(input.length, props.maxLength) }}
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* body 贴边（bodyFlush）后由本区块自带内边距，对齐 add-contact-modal 表单项 20px 内收口径 */
.chat-info-drawer-field-edit__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 20px 16px;
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
</style>
