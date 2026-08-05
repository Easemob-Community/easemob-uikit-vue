<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocale } from '../../locale'
import { CONVERSATION_TYPE } from '../../constants'
import { useUIKit } from '../../composables/use-uikit'
import { useViewport } from '../../composables/use-viewport'
import { useConversation } from '../../composables/use-conversation'
import { useContact } from '../../composables/use-contact'
import Popup from '../../components/popup/popup.vue'
import ContactList from '../contact/contact-list.vue'
import type { UiContact } from '../../sdk/types'

export interface NewChatModalProps {
  show: boolean
}

export interface NewChatModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'created', userId: string): void
}

const props = defineProps<NewChatModalProps>()
const emit = defineEmits<NewChatModalEmits>()

const { t } = useLocale()
const { isMobile } = useViewport()
const { stores } = useUIKit()
const { selectConversation } = useConversation()
const { fetchContacts } = useContact()

const loading = ref(false)
const errorMsg = ref('')

function onClose() {
  emit('update:show', false)
}

function reset() {
  loading.value = false
  errorMsg.value = ''
}

async function onSelectContact(contact: UiContact) {
  const targetId = contact.userId
  if (!targetId)
    return
  if (targetId === stores.client.currentUser) {
    errorMsg.value = t('conversation.newChatSelfError') || '不能和自己创建会话'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const existing = stores.conversation.conversationList.find(c => c.id === targetId)
    if (!existing) {
      stores.conversation.addConversation({
        id: targetId,
        name: contact.name || contact.remark || contact.userId,
        avatar: contact.avatar,
        type: CONVERSATION_TYPE.SINGLECHAT,
        unreadCount: 0,
        lastMessageText: '',
        isPinned: false,
        isMuted: false,
        marks: [],
      })
    }
    selectConversation(targetId)
    emit('created', targetId)
    onClose()
  }
  catch (err) {
    errorMsg.value = (err as Error).message || (t('conversation.newChatFailed') || '创建会话失败')
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (show) => {
    if (show) {
      reset()
      await fetchContacts()
    }
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
    <div class="new-chat-modal" :class="{ 'new-chat-modal--mobile': isMobile }">
      <div class="new-chat-modal__header">
        <span class="new-chat-modal__title">{{ t('conversation.newChat') || '新会话' }}</span>
      </div>
      <div class="new-chat-modal__body">
        <ContactList
          :show-header="false"
          :show-scroll-to-top="false"
          :show-alphabet-nav="false"
          group-by="none"
          select-mode="single"
          :loading="loading"
          @select="onSelectContact"
        />
        <div v-if="errorMsg" class="new-chat-modal__error">
          {{ errorMsg }}
        </div>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.new-chat-modal {
  width: 360px;
  max-width: 90vw;
  height: 60vh;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  overflow: hidden;
}

.new-chat-modal--mobile {
  width: 100vw;
  max-width: 100vw;
  height: 80vh;
  max-height: 80vh;
  border-radius: var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px) 0 0;
}

.new-chat-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  flex-shrink: 0;
}

.new-chat-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.new-chat-modal__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.new-chat-modal__error {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--uikit-danger-color, #ef4444);
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  border-radius: var(--uikit-components-radius, 8px);
  text-align: center;
}
</style>
