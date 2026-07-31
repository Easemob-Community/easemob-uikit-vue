<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../locale'
import { useClient } from '../../composables/use-client'
import { usePresence } from '../../composables/use-presence'
import { useToast } from '../../composables/use-toast'
import Popup from '../popup/popup.vue'
import PresenceSelector from './presence-selector.vue'

export interface PresenceSelectorPopupProps {
  show: boolean
  /** 锚定元素，popup 将相对于该元素定位 */
  anchor?: HTMLElement
  /** 相对锚点的位置，默认 'bottom' */
  placement?: 'bottom' | 'top' | 'left' | 'right'
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

async function onSelect(_status: string, ext: string) {
  try {
    await publishPresence(ext)
    emit('changed')
  }
  catch (err) {
    console.warn('[PresenceSelectorPopup] publish failed:', err)
    showToast(t('presence.publishFailed') || '状态设置失败')
  }
}

function onCancel() {
  showModel.value = false
}
</script>

<template>
  <Popup
    :show="showModel"
    :anchor="props.anchor"
    :placement="props.placement ?? 'bottom'"
    :offset="8"
    :overlay="false"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => showModel = v"
    @close="onCancel"
  >
    <PresenceSelector
      :value="currentExt"
      compact
      @select="onSelect"
      @cancel="onCancel"
    />
  </Popup>
</template>
