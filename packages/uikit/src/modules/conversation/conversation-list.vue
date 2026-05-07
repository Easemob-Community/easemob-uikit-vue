<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import { useConversation } from '../../composables/use-conversation'
import { useLocale } from '../../locale'
import ConversationItem from './conversation-item.vue'
import Modal from '../../components/modal/modal.vue'
import Input from '../../components/input/input.vue'
import type { ConversationAction } from './types'

const props = withDefaults(defineProps<{
  showSearch?: boolean
  customActions?: ConversationAction[]
}>(), {
  showSearch: true,
  customActions: () => [],
})

const { conversationList, currentConversation, hasMore, loadingMore, selectConversation, pinConversation, sendChannelAck, deleteConversation, loadMoreConversations } = useConversation()
const { t } = useLocale()

const itemsRef = ref<HTMLElement>()
const searchKeyword = ref('')

const filteredConversationList = computed(() => {
  if (!searchKeyword.value.trim()) return conversationList.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return conversationList.value.filter((item) => {
    const matchId = item.id.toLowerCase().includes(kw)
    const matchMsg = item.lastMessage?.toLowerCase().includes(kw)
    return matchId || matchMsg
  })
})

useInfiniteScroll(
  itemsRef,
  () => {
    if (hasMore.value && !loadingMore.value) {
      loadMoreConversations()
    }
  },
  { distance: 50 }
)

function handleSelect(id: string) {
  selectConversation(id)
  // 进入会话后发送已读回执
  sendChannelAck(id)
}

/** 删除确认 */
const showDeleteModal = ref(false)
const pendingDeleteId = ref('')

function handleDelete(id: string) {
  pendingDeleteId.value = id
  showDeleteModal.value = true
}

function confirmDelete() {
  if (pendingDeleteId.value) {
    deleteConversation(pendingDeleteId.value)
    pendingDeleteId.value = ''
  }
}
</script>

<template>
  <div class="conversation-list">
    <div class="conversation-list__header">
      <slot name="header">
        <span class="conversation-list__title">{{ t('conversation.title') }}</span>
      </slot>
    </div>
    <div v-if="props.showSearch" class="conversation-list__search">
      <Input
        v-model="searchKeyword"
        :placeholder="t('conversation.searchPlaceholder')"
      />
    </div>
    <div ref="itemsRef" class="conversation-list__items">
      <ConversationItem
        v-for="item in filteredConversationList"
        :key="item.id"
        :conversation="item"
        :class="{ 'is-active': currentConversation?.id === item.id }"
        :custom-actions="props.customActions"
        @select="handleSelect"
        @pin="pinConversation"
        @delete="handleDelete"
        @read="sendChannelAck"
      />
      <div v-if="loadingMore" class="conversation-list__loading">
        {{ t('conversation.loadingMore') }}
      </div>
    </div>

    <!-- 删除会话二次确认 -->
    <Modal
      v-model:show="showDeleteModal"
      :title="t('conversation.delete')"
      :confirm-text="t('button.confirm')"
      :cancel-text="t('button.cancel')"
      @confirm="confirmDelete"
    >
      <div>{{ t('conversation.deleteConfirm') }}</div>
    </Modal>
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
}

.conversation-list__header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.conversation-list__search {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.conversation-list__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.conversation-list__items {
  flex: 1;
  overflow-y: auto;
}

.conversation-list__loading {
  padding: 12px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--uikit-text-secondary);
}
</style>
