<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { formatSdkError } from '../../utils/sdk-error'
import type { UiGroup } from '../../sdk/types'
import GroupCard from '../../components/group-card/group-card.vue'
import IconButton from '../../components/icon-button/icon-button.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { CONVERSATION_TYPE, GROUP_MEMBER_ROLE } from '../../constants'
import { useGroup } from '../../composables/use-group'
import { useToast } from '../../composables/use-toast'
import { insertChatNotice } from '../../sdk/event/notice-utils'
import { createLogger } from '../../utils/logger'

const logger = createLogger('UIKit:GroupDetail')

export interface GroupDetailProps {
  /** 群 ID */
  groupId: string
  /** 外部已缓存的群摘要（可选，用于首屏快速展示） */
  group?: UiGroup | null
}

const props = withDefaults(defineProps<GroupDetailProps>(), {
  group: null,
})

const emit = defineEmits<{
  (e: 'send-message', groupId: string): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { fetchGroupInfo, updateGroupInfo } = useGroup()

const loading = ref(false)
/** 当前会话内已拉取失败的群 ID，避免空结果导致死循环 */
const fetchFailedIds = ref<Set<string>>(new Set())

// 群名称编辑状态
const isEditingName = ref(false)
const nameInputRef = ref<HTMLInputElement>()
const nameInput = ref('')
const savingName = ref(false)

const groupFromStore = computed(() => stores.group.getGroupById(props.groupId))

const isOwner = computed(() => groupFromStore.value?.role === GROUP_MEMBER_ROLE.OWNER)

watch(
  () => props.groupId,
  () => {
    void loadData()
  },
  { immediate: true },
)

async function loadData() {
  if (!props.groupId)
    return
  // 列表数据不一定含 role，必须 fetchGroupInfo 补齐后才能跳过
  if ((groupFromStore.value?.groupName && groupFromStore.value?.role) || loading.value || fetchFailedIds.value.has(props.groupId))
    return

  loading.value = true
  try {
    const info = await fetchGroupInfo(props.groupId)
    if (!info || !info.groupId)
      fetchFailedIds.value.add(props.groupId)
  }
  catch (err) {
    logger.warn('[GroupDetail] fetchGroupInfo failed:', formatSdkError(err))
    fetchFailedIds.value.add(props.groupId)
  }
  finally {
    loading.value = false
  }
}

const displayGroup = computed<UiGroup | undefined>(() => {
  return groupFromStore.value || props.group || undefined
})

const displayAvatar = computed(() => displayGroup.value?.avatar)
const displayName = computed(() => displayGroup.value?.groupName || props.groupId)

// 同步编辑输入
watch(displayName, (val) => {
  if (!isEditingName.value)
    nameInput.value = val
}, { immediate: true })

function startEditName() {
  nameInput.value = displayName.value
  isEditingName.value = true
}

function cancelEditName() {
  nameInput.value = displayName.value
  isEditingName.value = false
}

// 自动聚焦编辑输入框
watch(isEditingName, async (editing) => {
  if (editing) {
    await nextTick()
    nameInputRef.value?.focus()
  }
})

async function saveName() {
  if (!props.groupId)
    return
  savingName.value = true
  try {
    // 记录旧群名（updateGroupInfo 会同步更新 store，必须先取）
    const prevGroupName = stores.group.getGroupById(props.groupId)?.groupName
    await updateGroupInfo(props.groupId, { name: nameInput.value })
    isEditingName.value = false
    // 发布方本地插入灰色通知（SDK 事件不回推操作者本人），仅名称实际变更时插入
    if (prevGroupName && prevGroupName !== nameInput.value) {
      insertChatNotice(stores, props.groupId, CONVERSATION_TYPE.GROUPCHAT, t('chat.notice.groupNameChanged').replace('{name}', nameInput.value))
    }
    // 同步会话名称：会话列表/聊天头部/详情抽屉均展示 conversation.name，
    // 否则需刷新（重新同步会话）才能看到新群名
    stores.conversation.updateConversation(props.groupId, { name: nameInput.value })
    showToast(t('chat.info.groupInfoUpdated', '更新成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed', '更新失败'), 'error')
  }
  finally {
    savingName.value = false
  }
}

const cardActions = computed(() => {
  return [
    {
      key: 'message',
      label: t('contact.detail.sendMessage', '发消息'),
      icon: 'chat/bubble_fill',
      type: 'primary' as const,
    },
  ]
})

const cardInfoRows = computed(() => {
  const rows: { key: string, label: string, value: string }[] = []
  const g = displayGroup.value

  if (g?.description)
    rows.push({ key: 'description', label: t('groupCard.description', '群介绍'), value: g.description })

  if (g?.memberCount !== undefined)
    rows.push({ key: 'memberCount', label: t('groupCard.memberCount', '成员数'), value: String(g.memberCount) })

  rows.push({ key: 'groupId', label: t('groupCard.groupId', '群 ID'), value: props.groupId })

  return rows
})

function onCardAction(key: string) {
  if (key === 'message')
    emit('send-message', props.groupId)
}
</script>

<template>
  <div class="group-detail">
    <div class="group-detail__wrapper">
      <div v-if="loading" class="group-detail__loading">
        {{ t('common.loading', '加载中...') }}
      </div>

      <GroupCard
        :group-id="props.groupId"
        :name="displayName"
        :avatar="displayAvatar"
        :actions="cardActions"
        :info-rows="cardInfoRows"
        @action-click="onCardAction"
      >
        <template v-if="isOwner" #name>
          <template v-if="!isEditingName">
            <span>{{ displayName }}</span>
            <IconButton
              icon="actions/edit"
              size="small"
              type="primary"
              :title="t('chat.info.edit', '编辑')"
              @click="startEditName"
            />
          </template>
          <div v-else class="group-detail__edit-row">
            <input
              ref="nameInputRef"
              v-model="nameInput"
              class="group-detail__edit-input"
              @keydown.enter="saveName"
              @keydown.esc="cancelEditName"
            >
            <IconButton
              icon="actions/xmark_thick"
              size="small"
              type="danger"
              :title="t('button.cancel', '取消')"
              @click="cancelEditName"
            />
            <IconButton
              class="group-detail__edit-save"
              icon="actions/check"
              size="small"
              type="success"
              :disabled="savingName"
              :title="t('chat.info.save', '保存')"
              @click="saveName"
            />
          </div>
        </template>
      </GroupCard>
    </div>
  </div>
</template>

<style scoped>
.group-detail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  background-color: var(--uikit-bg-secondary, #f3f4f6);
  overflow-y: auto;
}

.group-detail__wrapper {
  position: relative;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-detail__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-14);
  border-radius: var(--uikit-components-radius, 12px);
  z-index: 1;
}

/* 群名称编辑 */
.group-detail__edit-row {
  display: flex;
  gap: 8px;
}

.group-detail__edit-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--uikit-primary-color);
  border-radius: var(--uikit-components-radius, 6px);
  font-size: var(--uikit-font-size-20);
  font-weight: 600;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}

.group-detail__edit-save {
  flex-shrink: 0;
}
</style>
