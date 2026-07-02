<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Icon from '../../../components/icon/icon.vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import { useContact } from '../../../composables/use-contact'
import { useToast } from '../../../composables/use-toast'
import { useUserInfo } from '../../../composables/use-user-info'
import type { UiConversation as Conversation } from '../../../sdk/types'
import ChatDrawer from './chat-drawer.vue'

export interface ChatInfoDrawerProps {
  show: boolean
  conversation?: Conversation | null
  isGroup?: boolean
  offsetTop?: string | number
}

const props = defineProps<ChatInfoDrawerProps>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const themeStore = useThemeStore()
const { t } = useLocale()
const { setContactRemark } = useContact()
const { show: showToast } = useToast()
const closeBtnClass = computed(() =>
  themeStore.componentsShape === 'square' ? 'chat-info-drawer__close--square' : '',
)

/** 备注编辑状态 */
const isEditingRemark = ref(false)
const remarkInput = ref('')
const savingRemark = ref(false)

const peerUserId = computed(() =>
  props.conversation?.type === 'singleChat' ? props.conversation.id : undefined,
)
const { userInfo, avatarUrl, contact } = useUserInfo(peerUserId)

watch(
  () => contact.value?.remark,
  (remark) => {
    if (!isEditingRemark.value)
      remarkInput.value = remark || ''
  },
  { immediate: true },
)

/** 群成员（mock） */
const groupMembers = ref([
  { id: '1', name: '成员A' },
  { id: '2', name: '成员B' },
  { id: '3', name: '成员C' },
  { id: '4', name: '成员D' },
  { id: '5', name: '成员E' },
  { id: '6', name: '成员F' },
  { id: '7', name: '成员G' },
  { id: '8', name: '成员H' },
  { id: '9', name: '成员I' },
  { id: '10', name: '成员J' },
])

/** 当前名称/备注：单聊按 备注 > 资料昵称 > 会话名 > unnamed */
const displayName = computed(() => {
  if (props.conversation?.type === 'groupChat')
    return props.conversation.name || t('chat.info.unnamed')
  return (
    contact.value?.remark
    || userInfo.value?.nickname
    || props.conversation?.name
    || t('chat.info.unnamed')
  )
})

/** 当前头像：单聊优先取用户资料头像 */
const displayAvatar = computed(() => {
  if (props.conversation?.type === 'groupChat')
    return props.conversation.avatar
  return avatarUrl.value || props.conversation?.avatar
})

/** 关闭抽屉 */
function onClose() {
  emit('update:show', false)
  isEditingRemark.value = false
}

/** 保存备注 */
async function saveRemark() {
  const userId = peerUserId.value
  if (!userId)
    return

  savingRemark.value = true
  try {
    await setContactRemark(userId, remarkInput.value)
    isEditingRemark.value = false
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.remarkSaveFailed') || '备注设置失败')
  }
  finally {
    savingRemark.value = false
  }
}

/** 删除好友 / 退出群聊 */
function onLeaveOrDelete() {
  // TODO: 接入 SDK
  onClose()
}
</script>

<template>
  <ChatDrawer
    :show="props.show"
    :overlay="false"
    :offset-top="props.offsetTop"
    @update:show="emit('update:show', $event)"
    @close="onClose"
  >
    <!-- Header 插槽 -->
    <template #header>
      <div class="chat-info-drawer__header">
        <button class="chat-info-drawer__close" :class="closeBtnClass" @click="onClose">
          <Icon name="arrows/arrow_left_thick" :size="16" />
        </button>
        <span class="chat-info-drawer__title">
          {{ isGroup ? t('chat.info.titleGroup') : t('chat.info.titleFriend') }}
        </span>
        <button class="chat-info-drawer__close" :class="closeBtnClass" @click="onClose">
          <Icon name="actions/xmark_thick" :size="16" />
        </button>
      </div>
    </template>

    <!-- Body 默认插槽 -->
    <div class="chat-info-drawer__profile">
      <Avatar :name="displayName" :src="displayAvatar" :size="64" />
      <div class="chat-info-drawer__name">
        {{ displayName }}
      </div>
      <div v-if="!isGroup" class="chat-info-drawer__id">
        ID: {{ conversation?.id }}
      </div>
    </div>

    <!-- 单聊：备注编辑 -->
    <div v-if="!isGroup" class="chat-info-drawer__section">
      <div class="chat-info-drawer__section-title">
        {{ t('chat.info.remark') }}
      </div>
      <div v-if="!isEditingRemark" class="chat-info-drawer__remark" @click="isEditingRemark = true">
        <span>{{ remarkInput || t('chat.info.remarkPlaceholder') }}</span>
        <Icon name="misc/edit" :size="16" />
      </div>
      <div v-else class="chat-info-drawer__remark-edit">
        <input
          v-model="remarkInput"
          class="chat-info-drawer__remark-input"
          :placeholder="t('chat.info.remarkInputPlaceholder')"
          @keydown.enter="saveRemark"
        >
        <button
          class="chat-info-drawer__remark-save"
          :disabled="savingRemark"
          @click="saveRemark"
        >
          {{ savingRemark ? t('chat.info.saving') || '保存中...' : t('chat.info.save') }}
        </button>
      </div>
    </div>

    <!-- 群聊：成员列表（纵向滚动） -->
    <div v-if="isGroup" class="chat-info-drawer__section">
      <div class="chat-info-drawer__section-title">
        {{ t('chat.info.groupMembers') }} <span class="chat-info-drawer__count">({{ groupMembers.length }})</span>
      </div>
      <div class="chat-info-drawer__member-list">
        <div v-for="member in groupMembers" :key="member.id" class="chat-info-drawer__member-row">
          <Avatar :name="member.name" :size="40" />
          <span class="chat-info-drawer__member-row-name">{{ member.name }}</span>
        </div>
      </div>
    </div>

    <!-- Footer 插槽 -->
    <template #footer>
      <div class="chat-info-drawer__actions">
        <button
          class="chat-info-drawer__action-btn chat-info-drawer__action-btn--danger"
          @click="onLeaveOrDelete"
        >
          {{ isGroup ? t('chat.info.leaveGroup') : t('chat.info.deleteFriend') }}
        </button>
      </div>
    </template>
  </ChatDrawer>
</template>

<style scoped>
.chat-info-drawer__header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  gap: 12px;
}

.chat-info-drawer__close {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  padding: 0;
  transition: background-color 0.15s;
}

.chat-info-drawer__close:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__close--square {
  border-radius: 2px;
}

.chat-info-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  flex: 1;
  text-align: center;
}

.chat-info-drawer__spacer {
  width: 28px;
}

.chat-info-drawer__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  gap: 12px;
  flex-shrink: 0;
}

.chat-info-drawer__name {
  font-size: 18px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.chat-info-drawer__id {
  font-size: 13px;
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__section {
  padding: 16px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.chat-info-drawer__section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  margin-bottom: 12px;
}

.chat-info-drawer__count {
  font-weight: 400;
  color: var(--uikit-text-secondary);
}

.chat-info-drawer__remark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  cursor: pointer;
}

.chat-info-drawer__remark-edit {
  display: flex;
  gap: 8px;
}

.chat-info-drawer__remark-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 6px);
  font-size: 14px;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}

.chat-info-drawer__remark-input:focus {
  border-color: var(--uikit-primary-color);
}

.chat-info-drawer__remark-save {
  padding: 8px 16px;
  border-radius: var(--uikit-components-radius, 6px);
  border: none;
  background-color: var(--uikit-primary-color);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.chat-info-drawer__remark-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 纵向成员列表 */
.chat-info-drawer__member-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-info-drawer__member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-info-drawer__member-row:hover {
  background-color: var(--uikit-bg-secondary);
}

.chat-info-drawer__member-row-name {
  font-size: 14px;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-info-drawer__actions {
  padding: 16px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
}

.chat-info-drawer__action-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--uikit-components-radius, 8px);
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat-info-drawer__action-btn:hover {
  opacity: 0.9;
}

.chat-info-drawer__action-btn--danger {
  background-color: #fef2f2;
  color: #ef4444;
}
</style>
