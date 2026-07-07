<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../../locale'
import { usePresence } from '../../composables/use-presence'
import { useToast } from '../../composables/use-toast'
import Popup from '../popup/popup.vue'
import PresenceSelector from './presence-selector.vue'

export interface PresenceSelectorModalProps {
  show: boolean
  /** 当前自定义状态文本 */
  value?: string
}

const props = defineProps<PresenceSelectorModalProps>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { publishPresence } = usePresence()

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
    showModel.value = false
  }
  catch (err) {
    console.warn('[PresenceSelectorModal] publish failed:', err)
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
    position="center"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => showModel = v"
    @close="onCancel"
  >
    <PresenceSelector
      :value="props.value"
      @select="onSelect"
      @cancel="onCancel"
    />
  </Popup>
</template>
