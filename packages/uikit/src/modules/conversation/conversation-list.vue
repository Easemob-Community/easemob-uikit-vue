<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInfiniteScroll, onClickOutside } from '@vueuse/core'
import { useConversation } from '../../composables/use-conversation'
import { useViewport } from '../../composables/use-viewport'
import { usePullRefresh } from '../../composables/use-pull-refresh'
import { useLocale } from '../../locale'
import ConversationItem from './conversation-item.vue'
import Modal from '../../components/modal/modal.vue'
import Input from '../../components/input/input.vue'
import Icon from '../../components/icon/icon.vue'
import ActionSheet from '../../components/action-sheet/action-sheet.vue'
import ScrollToTop from '../../components/scroll-to-top/scroll-to-top.vue'
import type { ConversationAction } from './types'
import type { Conversation } from '../../store/conversation'

const props = withDefaults(defineProps<{
  showSearch?: boolean
  customActions?: ConversationAction[]
  showScrollToTop?: boolean
  timeFormatter?: (timestamp: number) => string
  messageFormatter?: (msg: string, type?: string) => string
  showSenderName?: boolean
  emptyText?: string
  unreadMode?: 'count' | 'dot'
  /** Header 标题文本，不传则使用 i18n 默认值 */
  title?: string
  /** 自定义搜索过滤函数 */
  filterFn?: (keyword: string, item: Conversation) => boolean
  /** #body slot 是否固定不随列表滚动，默认 false */
  bodySticky?: boolean
  /** #footer slot 是否固定不随列表滚动，默认 false */
  footerSticky?: boolean
  /** 是否启用下拉刷新（H5），默认 false */
  pullRefresh?: boolean
}>(), {
  showSearch: true,
  customActions: () => [],
  showScrollToTop: true,
  showSenderName: true,
  unreadMode: 'count',
  bodySticky: false,
  footerSticky: false,
  pullRefresh: false,
})

const emit = defineEmits<{
  (e: 'select', id: string, conversation: Conversation): void
}>()

const { conversationList, currentConversation, hasMore, loadingMore, selectConversation, pinConversation, sendChannelAck, deleteConversation, loadMoreConversations, fetchServerConversations, saveDraft, loadDraft, clearDraft } = useConversation()
const { t } = useLocale()
const { isMobile } = useViewport()

const itemsRef = ref<HTMLElement>()
const searchKeyword = ref('')
/** 规范化后的搜索关键字（去空格），用于过滤和空状态判断 */
const normalizedSearchKeyword = computed(() => searchKeyword.value.trim())
const showHeaderMenu = ref(false)
const headerMenuRef = ref<HTMLElement>()
const showHeaderActionSheet = ref(false)

/** 下拉刷新 */
const { isRefreshing: isPullRefreshing } = usePullRefresh(
  itemsRef,
  {
    onRefresh: async () => {
      await fetchServerConversations({ pageSize: 20 })
    },
  }
)

onClickOutside(headerMenuRef, () => {
  showHeaderMenu.value = false
})

/** Header 菜单项定义 */
const headerMenuItems = computed(() => [
  { key: 'newChat', label: t('conversation.newChat'), icon: 'chat/bubble_fill' },
  { key: 'addContact', label: t('conversation.addContact'), icon: 'people/person_add' },
  { key: 'createGroup', label: t('conversation.createGroup'), icon: 'people/person_double_fill' },
])

const headerActionSheetActions = computed(() =>
  headerMenuItems.value.map((item) => ({ name: item.label, icon: item.icon }))
)

function onHeaderMenuClick() {
  if (isMobile.value) {
    showHeaderActionSheet.value = true
  } else {
    showHeaderMenu.value = !showHeaderMenu.value
  }
}

function onHeaderActionSheetSelect(_item: { name: string; icon?: string }, index: number) {
  // TODO: 根据 key 执行对应操作
  headerMenuItems.value[index]
}

function onHeaderMenuItemClick(key: string) {
  showHeaderMenu.value = false
  // TODO: 根据 key 执行对应操作
  void key
}

const filteredConversationList = computed(() => {
  if (!normalizedSearchKeyword.value) return conversationList.value
  const kw = normalizedSearchKeyword.value.toLowerCase()
  if (props.filterFn) {
    return conversationList.value.filter((item) => props.filterFn!(kw, item))
  }
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
  // 切换会话前，为当前会话保存草稿（如果有输入内容，由 chat-container 侧触发）
  selectConversation(id)
  // 进入会话后发送已读回执
  sendChannelAck(id)
  // 加载目标会话的草稿
  loadDraft(id)
  // 通知上层
  const cvs = conversationList.value.find((c: Conversation) => c.id === id)
  if (cvs) {
    emit('select', id, cvs)
  }
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
    clearDraft(pendingDeleteId.value)
    deleteConversation(pendingDeleteId.value)
    pendingDeleteId.value = ''
  }
}
</script>

<template>
  <div class="conversation-list">
    <div class="conversation-list__header">
      <slot name="header">
        <span class="conversation-list__title">{{ props.title || t('conversation.title') }}</span>
      </slot>
      <div ref="headerMenuRef" class="conversation-list__menu-wrapper">
        <div class="conversation-list__menu-trigger" @click="onHeaderMenuClick">
          <Icon name="actions/plus_in_circle" :size="22" />
        </div>
        <div v-if="showHeaderMenu && !isMobile" class="conversation-list__menu">
          <div
            v-for="item in headerMenuItems"
            :key="item.key"
            class="conversation-list__menu-item"
            @click="onHeaderMenuItemClick(item.key)"
          >
            <Icon :name="item.icon" :size="18" />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="props.showSearch" class="conversation-list__search">
      <Input
        v-model="searchKeyword"
        :placeholder="t('conversation.searchPlaceholder')"
        prefix-icon="misc/magnifier2"
      />
    </div>
    <!-- body slot - sticky 模式放在滚动容器外部 -->
    <div v-if="$slots.body && props.bodySticky" class="conversation-list__body conversation-list__body--sticky">
      <slot name="body" />
    </div>
    <div ref="itemsRef" class="conversation-list__items">
      <!-- 下拉刷新指示器（H5） -->
      <div v-if="props.pullRefresh && isPullRefreshing" class="conversation-list__pull-refresh">
        {{ t('conversation.pullRefresh') }}
      </div>
      <!-- body slot - 非 sticky 模式放在滚动容器内部 -->
      <div v-if="$slots.body && !props.bodySticky" class="conversation-list__body">
        <slot name="body" />
      </div>
      <ConversationItem
        v-for="item in filteredConversationList"
        :key="item.id"
        :conversation="item"
        :class="{ 'is-active': currentConversation?.id === item.id }"
        :custom-actions="props.customActions"
        :time-formatter="props.timeFormatter"
        :message-formatter="props.messageFormatter"
        :show-sender-name="props.showSenderName"
        :unread-mode="props.unreadMode"
        @select="handleSelect"
        @pin="pinConversation"
        @delete="handleDelete"
        @read="sendChannelAck"
      />
      <div v-if="loadingMore" class="conversation-list__loading">
        {{ t('conversation.loadingMore') }}
      </div>
      <div v-if="!filteredConversationList.length && !loadingMore" class="conversation-list__empty">
        <slot name="empty" :search-keyword="normalizedSearchKeyword">
          <span>{{ props.emptyText || (normalizedSearchKeyword ? t('conversation.noSearchResult') : t('conversation.empty')) }}</span>
        </slot>
      </div>
      <!-- footer slot - 非 sticky 模式放在滚动容器内部 -->
      <div v-if="$slots.footer && !props.footerSticky" class="conversation-list__footer">
        <slot name="footer" />
      </div>
    </div>

    <!-- footer slot - sticky 模式放在滚动容器外部 -->
    <div v-if="$slots.footer && props.footerSticky" class="conversation-list__footer conversation-list__footer--sticky">
      <slot name="footer" />
    </div>

    <!-- 滚动置顶按钮：放在滚动容器外部，由 conversation-list 定位 -->
    <ScrollToTop
      v-if="props.showScrollToTop"
      :target="itemsRef ?? undefined"
      :visibility-height="200"
      :bottom="12"
      :right="12"
    />

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

    <!-- H5 Header 菜单 ActionSheet -->
    <ActionSheet
      v-model:show="showHeaderActionSheet"
      :actions="headerActionSheetActions"
      @select="onHeaderActionSheetSelect"
    />
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  position: relative;
}

.conversation-list__header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-list__menu-wrapper {
  position: relative;
}

.conversation-list__menu-trigger {
  cursor: pointer;
  color: var(--uikit-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 50%;
  transition: background-color 0.15s;
}

.conversation-list__menu-trigger:hover {
  background-color: var(--uikit-bg-secondary);
}

.conversation-list__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: var(--uikit-bg-base);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 160px;
  padding: 6px 0;
  z-index: 100;
}

.conversation-list__menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.conversation-list__menu-item:hover {
  background-color: var(--uikit-bg-secondary);
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

.conversation-list__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}

.conversation-list__body {
  padding: 0 16px;
}

.conversation-list__body--sticky {
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
}

.conversation-list__footer {
  padding: 8px 16px;
}

.conversation-list__footer--sticky {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
}

.conversation-list__pull-refresh {
  padding: 12px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--uikit-text-secondary);
}
</style>
