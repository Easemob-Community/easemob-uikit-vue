<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUIKit } from '../../../composables/use-uikit'
import { useLocale } from '@easemob-community/uikit-core'
import { useViewport } from '@easemob-community/uikit-core'
import { EmPopup as Popup } from '@easemob-community/uikit-core'
import { EmAvatar as Avatar } from '@easemob-community/uikit-core'
import { EmCell as Cell } from '@easemob-community/uikit-core'
import { EmInput as Input } from '@easemob-community/uikit-core'
import { EmEmpty as Empty } from '@easemob-community/uikit-core'
import { CONVERSATION_TYPE } from '@easemob-community/uikit-core'
import type { UiConversation as Conversation } from '@easemob-community/uikit-core'
import { DEFAULT_GROUP_AVATAR } from '../../../assets'

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

/** 会话头像：群会话无头像时回落默认群头像 */
function resolveAvatar(item: Conversation) {
  return item.avatar || (item.type === CONVERSATION_TYPE.GROUPCHAT ? DEFAULT_GROUP_AVATAR : undefined)
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
          clear-icon="search/xmark"
          :placeholder="t('conversation.searchPlaceholder')"
          prefix-icon="search"
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
            <Avatar :src="resolveAvatar(item)" :name="item.name" :size="40" />
          </template>
        </Cell>
        <Empty
          v-if="!filteredConversations.length"
          icon="bubble/rect/empty"
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
  /* 移动端优先使用动态视口高度，不支持的浏览器回退到上面的 80vh */
  max-height: 80dvh;
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
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-semibold);
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
