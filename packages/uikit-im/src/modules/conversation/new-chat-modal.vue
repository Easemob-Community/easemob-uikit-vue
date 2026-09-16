<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocale } from '@easemob/uikit-core'
import { CONVERSATION_TYPE } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useConversation } from '../../composables/use-conversation'
import { useContact } from '../../composables/use-contact'
import { EmModal as Modal } from '@easemob/uikit-core'
import ContactList from '../contact/contact-list.vue'
import type { UiContact } from '@easemob/uikit-core'

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
    errorMsg.value = t('conversation.newChatSelfError', '不能和自己创建会话')
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
    errorMsg.value = (err as Error).message || (t('conversation.newChatFailed', '创建会话失败'))
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
  <Modal
    :show="props.show"
    :title="t('conversation.newChat', '新会话')"
    :width="480"
    :show-footer="false"
    body-flush
    @update:show="emit('update:show', $event)"
    @cancel="onClose"
  >
    <div class="new-chat-modal__list">
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
  </Modal>
</template>

<style scoped>
.new-chat-modal__list {
  height: min(60vh, 460px);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 列表行对齐 Shuttle 范式：行间发丝线左内收，从名字起点开始 */
.new-chat-modal__list :deep(.contact-item) {
  margin-bottom: 0;
}

.new-chat-modal__list :deep(.contact-item-default)::after {
  content: '';
  position: absolute;
  left: calc(var(--uikit-item-hover-padding-x, 16px) + 48px + var(--uikit-spacing-3, 12px));
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: var(--uikit-divider-color, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.new-chat-modal__error {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  padding: 8px 12px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-danger-color);
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  border-radius: var(--uikit-components-radius, 8px);
  text-align: center;
}
</style>
