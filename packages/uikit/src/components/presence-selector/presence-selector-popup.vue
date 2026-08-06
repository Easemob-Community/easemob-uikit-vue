<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatSdkError } from '../../utils/sdk-error'
import { useLocale } from '../../locale'
import { useClient } from '../../composables/use-client'
import { usePresence } from '../../composables/use-presence'
import { useToast } from '../../composables/use-toast'
import Popup from '../popup/popup.vue'
import Modal from '../modal/modal.vue'
import Input from '../input/input.vue'
import PresenceSelector from './presence-selector.vue'
import { createLogger } from '../../utils/logger'

const logger = createLogger('UIKit:PresenceSelectorPopup')

export interface PresenceSelectorPopupProps {
  show: boolean
  /** 锚定元素，popup 将相对于该元素定位 */
  anchor?: HTMLElement
  /** 相对锚点的位置，默认 'bottom' */
  placement?: 'bottom' | 'top' | 'left' | 'right'
  /** 锚定轴上的对齐方式，默认 'start' */
  align?: 'start' | 'center' | 'end'
  /** 当前在线状态描述（ext），未传时自动从当前登录用户的 presence 缓存读取 */
  value?: string
}

const props = defineProps<PresenceSelectorPopupProps>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
  (e: 'changed'): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { currentUser } = useClient()
const { publishPresence, get } = usePresence()

const currentExt = computed(() => {
  if (props.value !== undefined)
    return props.value
  const userId = currentUser.value
  if (!userId)
    return ''
  return get(userId).value?.ext || ''
})

const showModel = computed({
  get: () => props.show,
  set: (v) => {
    emit('update:show', v)
    if (!v)
      emit('close')
  },
})

const showCustomModal = ref(false)
const customInput = ref('')

async function onSelect(_status: string, ext: string) {
  try {
    await publishPresence(ext)
    emit('changed')
  }
  catch (err) {
    logger.warn('[PresenceSelectorPopup] publish failed:', formatSdkError(err))
    showToast(t('presence.publishFailed', '状态设置失败'))
  }
}

function onCancel() {
  showModel.value = false
}

function onCustomClick() {
  // 点击自定义选项时关闭 popup，打开独立输入 modal
  showModel.value = false
  customInput.value = currentExt.value
  showCustomModal.value = true
}

function onCustomCancel() {
  showCustomModal.value = false
}

async function onCustomConfirm() {
  const text = customInput.value.trim()
  showCustomModal.value = false
  try {
    await publishPresence(text)
    emit('changed')
  }
  catch (err) {
    logger.warn('[PresenceSelectorPopup] publish custom failed:', formatSdkError(err))
    showToast(t('presence.publishFailed', '状态设置失败'))
  }
}
</script>

<template>
  <Popup
    :show="showModel"
    :anchor="props.anchor"
    :placement="props.placement ?? 'bottom'"
    :align="props.align ?? 'start'"
    :offset="8"
    :overlay="false"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => showModel = v"
    @close="onCancel"
  >
    <PresenceSelector
      :value="currentExt"
      compact
      :show-header="false"
      use-custom-modal
      @select="onSelect"
      @cancel="onCancel"
      @custom-click="onCustomClick"
    />
  </Popup>

  <Modal
    v-model:show="showCustomModal"
    :title="t('presence.setCustomStatus', '设置自定义状态')"
    :confirm-text="t('button.confirm', '确认')"
    :cancel-text="t('button.cancel', '取消')"
    @confirm="onCustomConfirm"
    @cancel="onCustomCancel"
  >
    <Input
      v-model="customInput"
      :placeholder="t('presence.customPlaceholder', '请输入自定义状态')"
      :maxlength="32"
      style="width: 100%; text-align: left;"
    />
  </Modal>
</template>
