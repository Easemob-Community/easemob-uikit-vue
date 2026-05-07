<script setup lang="ts">
import { onMounted } from 'vue'
import ConversationList from '../../modules/conversation/conversation-list.vue'
import { useConversation } from '../../composables/use-conversation'
import type { ConversationAction } from '../../modules/conversation/types'

export interface ConversationContainerProps {
  /** 默认从服务端获取的会话数量，max 50，默认 20 */
  pageSize?: number
  /** 是否拉取空会话（无消息记录的会话），默认 false */
  includeEmptyConversations?: boolean
  /** 是否展示搜索框，默认 true */
  showSearch?: boolean
  /** 自定义 popup/action sheet 条目 */
  customActions?: ConversationAction[]
}

const props = withDefaults(defineProps<ConversationContainerProps>(), {
  pageSize: 20,
  includeEmptyConversations: false,
  showSearch: true,
  customActions: () => [],
})

const { fetchServerConversations } = useConversation()

onMounted(() => {
  fetchServerConversations({
    pageSize: props.pageSize,
    includeEmptyConversations: props.includeEmptyConversations,
  })
})
</script>

<template>
  <div class="conversation-container">
    <ConversationList
      :show-search="props.showSearch"
      :custom-actions="props.customActions"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>
    </ConversationList>
  </div>
</template>

<style scoped>
.conversation-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}
</style>
