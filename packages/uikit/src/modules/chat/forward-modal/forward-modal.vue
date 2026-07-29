<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUIKit } from '../../../composables/use-uikit'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import Popup from '../../../components/popup/popup.vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import Input from '../../../components/input/input.vue'
import Empty from '../../../components/empty/empty.vue'
import type { UiConversation as Conversation } from '../../../sdk/types'

export interface ForwardModalProps {
  show: boolean
}

export interface ForwardModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'forward', conversation: Conversation): void
}

const props = defineProps<ForwardModalProps>()
const emit = defineEmits<ForwardModalEmits>()

const { stores } = useUIKit()
const { t } = useLocale()
const { isMobile } = useViewport()

const searchKeyword = ref('')

const conversationStore = stores.conversation

const filteredConversations = computed(() => {
  const list = conversationStore.sortedConversationList
  if (!searchKeyword.value.trim())
    return list
  const kw = searchKeyword.value.trim().toLowerCase()
  return list.filter((c: Conversation) =>
    c.name.toLowerCase().includes(kw) || c.id.toLowerCase().includes(kw),
  )
})

function onClose() {
  emit('update:show', false)
  searchKeyword.value = ''
}

function onSelect(conversation: Conversation) {
  emit('forward', conversation)
  onClose()
}
</script>

<template>
  <Popup
    :show="props.show"
    :position="isMobile ? 'bottom' : 'center'"
    :show-close="true"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <div class="forward-modal" :class="{ 'forward-modal--mobile': isMobile }">
      <div class="forward-modal__header">
        <span class="forward-modal__title">{{ t('message.action.forward') }}</span>
      </div>
      <div class="forward-modal__search">
        <Input
          v-model="searchKeyword"
          variant="search"
          :placeholder="t('conversation.searchPlaceholder')"
          prefix-icon="misc/magnifier2"
        />
      </div>
      <div class="forward-modal__list">
        <div
          v-for="item in filteredConversations"
          :key="item.id"
          class="forward-modal__item"
          @click="onSelect(item)"
        >
          <Avatar :src="item.avatar" :name="item.name" :size="40" />
          <div class="forward-modal__info">
            <span class="forward-modal__name">{{ item.name || item.id }}</span>
            <span v-if="item.lastMessageText" class="forward-modal__last-msg">{{ item.lastMessageText }}</span>
          </div>
          <Icon name="arrows/arrow_right" :size="16" class="forward-modal__arrow" />
        </div>
        <Empty
          v-if="!filteredConversations.length"
          icon="empty/conversation"
          :description="t('conversation.empty')"
          size="small"
        />
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.forward-modal {
  width: 400px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: 12px;
  overflow: hidden;
}

.forward-modal--mobile {
  width: 100vw;
  max-height: 80vh;
  border-radius: 12px 12px 0 0;
}

.forward-modal__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.forward-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.forward-modal__search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
}

.forward-modal__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.forward-modal__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.forward-modal__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.forward-modal__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.forward-modal__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.forward-modal__last-msg {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.forward-modal__arrow {
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}


</style>
