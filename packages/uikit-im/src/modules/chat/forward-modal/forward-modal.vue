<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUIKit } from '../../../composables/use-uikit'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import Popup from '../../../components/popup/popup.vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Cell from '../../../components/cell/cell.vue'
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
          clearable
          clear-icon="misc/search_clear"
          :placeholder="t('conversation.searchPlaceholder')"
          prefix-icon="misc/magnifier2"
        />
      </div>
      <div class="forward-modal__list">
        <Cell
          v-for="item in filteredConversations"
          :key="item.id"
          :title="item.name || item.id"
          :subtitle="item.lastMessageText || undefined"
          show-arrow
          @click="onSelect(item)"
        >
          <template #leading>
            <Avatar :src="item.avatar" :name="item.name" :size="40" />
          </template>
        </Cell>
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
  flex-shrink: 0;
}

.forward-modal__title {
  font-size: var(--uikit-font-size-16);
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


</style>
