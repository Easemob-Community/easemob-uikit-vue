<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useViewport } from '../../composables/use-viewport'
import { useContact } from '../../composables/use-contact'
import Popup from '../../components/popup/popup.vue'
import Input from '../../components/input/input.vue'
import Button from '../../components/button/button.vue'

export interface AddContactModalProps {
  show: boolean
}

export interface AddContactModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'added', userId: string): void
}

const props = defineProps<AddContactModalProps>()
const emit = defineEmits<AddContactModalEmits>()

const { t } = useLocale()
const { isMobile } = useViewport()
const { stores } = useUIKit()
const { addContact } = useContact()

const userId = ref('')
const reason = ref('')
const loading = ref(false)
const errorMsg = ref('')

const currentUserId = computed(() => stores.client.currentUser)
const canSubmit = computed(() => userId.value.trim() && !loading.value)

function onClose() {
  emit('update:show', false)
}

function reset() {
  userId.value = ''
  reason.value = ''
  errorMsg.value = ''
  loading.value = false
}

async function onConfirm() {
  const targetId = userId.value.trim()
  if (!targetId)
    return
  if (targetId === currentUserId.value) {
    errorMsg.value = t('contact.addSelfError') || '不能添加自己为好友'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    await addContact(targetId, reason.value.trim())
    emit('added', targetId)
    onClose()
  }
  catch (err) {
    errorMsg.value = (err as Error).message || (t('contact.addFailed') || '添加失败')
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (show) => {
    if (show)
      reset()
  },
)
</script>

<template>
  <Popup
    :show="props.show"
    :position="isMobile ? 'bottom' : 'center'"
    :show-close="true"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <div class="add-contact-modal" :class="{ 'add-contact-modal--mobile': isMobile }">
      <div class="add-contact-modal__header">
        <span class="add-contact-modal__title">{{ t('conversation.addContact') || '添加联系人' }}</span>
      </div>
      <div class="add-contact-modal__body">
        <div class="add-contact-modal__field">
          <label class="add-contact-modal__label">{{ t('contact.userId') || '用户 ID' }}</label>
          <Input
            v-model="userId"
            variant="default"
            :placeholder="t('contact.addContactPlaceholder') || '输入用户 ID'
            "
            @submit="onConfirm"
          />
        </div>
        <div class="add-contact-modal__field">
          <label class="add-contact-modal__label">{{ t('contact.inviteReason') || '附言' }}</label>
          <Input
            v-model="reason"
            variant="default"
            :placeholder="t('contact.addContactReasonPlaceholder') || '输入验证信息（可选）'
            "
          />
        </div>
        <div v-if="errorMsg" class="add-contact-modal__error">
          {{ errorMsg }}
        </div>
      </div>
      <div class="add-contact-modal__footer">
        <Button type="default" @click="onClose">
          {{ t('button.cancel') || '取消' }}
        </Button>
        <Button type="primary" :disabled="!canSubmit" :loading="loading" @click="onConfirm">
          {{ t('button.confirm') || '确认' }}
        </Button>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.add-contact-modal {
  width: 360px;
  max-width: 90vw;
  padding: 20px;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-contact-modal--mobile {
  width: 100vw;
  max-width: 100vw;
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
}

.add-contact-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-contact-modal__title {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.add-contact-modal__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-contact-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-contact-modal__label {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.add-contact-modal__error {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-danger-color, #ef4444);
}

.add-contact-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
</style>
