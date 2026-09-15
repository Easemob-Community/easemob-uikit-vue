<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { EmAvatar as Avatar, CONVERSATION_TYPE, GROUP_MEMBER_ROLE, EmIcon as Icon, EmIconButton as IconButton, EmModal as Modal, NOTICE_EVENT_TYPE, createLogger, formatSdkError, insertChatNotice, useLocale, useToast } from '@easemob/uikit-core'
import type { UiGroup } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'

const props = withDefaults(defineProps<GroupDetailProps>(), {
  group: null,
})

const emit = defineEmits<{
  (e: 'send-message', groupId: string): void
  /** 退出群聊成功后触发（组件内部已删除对应会话与消息缓存） */
  (e: 'leaved', groupId: string): void
  /** 解散群聊成功后触发（组件内部已删除对应会话与消息缓存） */
  (e: 'destroyed', groupId: string): void
}>()

const logger = createLogger('UIKit:GroupDetail')

export interface GroupDetailProps {
  /** 群 ID */
  groupId: string
  /** 外部已缓存的群摘要（可选，用于首屏快速展示） */
  group?: UiGroup | null
}

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { fetchGroupInfo, updateGroupInfo, leaveGroup, destroyGroup } = useGroup()

const loading = ref(false)
/** 当前会话内已拉取失败的群 ID，避免空结果导致死循环 */
const fetchFailedIds = ref<Set<string>>(new Set())

// 群名称编辑状态（modal 模式）
const nameModalShow = ref(false)
const nameInputRef = ref<HTMLInputElement>()
const nameInput = ref('')
const savingName = ref(false)

const confirmModal = ref<{
  show: boolean
  content: string
  action: 'leave' | 'destroy' | null
}>({
  show: false,
  content: '',
  action: null,
})

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

// 同步编辑输入（回显）
watch(displayName, (val) => {
  if (!nameModalShow.value)
    nameInput.value = val
}, { immediate: true })

function startEditName() {
  nameInput.value = displayName.value
  nameModalShow.value = true
}

function cancelEditName() {
  nameInput.value = displayName.value
  nameModalShow.value = false
}

// 弹窗打开后自动聚焦编辑输入框
watch(nameModalShow, async (show) => {
  if (show) {
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
    nameModalShow.value = false
    // 发布方本地插入灰色通知（SDK 事件不回推操作者本人），仅名称实际变更时插入
    if (prevGroupName && prevGroupName !== nameInput.value) {
      insertChatNotice(stores, props.groupId, CONVERSATION_TYPE.GROUPCHAT, {
        eventType: NOTICE_EVENT_TYPE.GROUP_NAME_CHANGED,
        params: { name: nameInput.value },
        defaultText: t('chat.notice.groupNameChanged').replace('{name}', nameInput.value),
      })
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

function openConfirm(action: 'leave' | 'destroy') {
  confirmModal.value = {
    show: true,
    content: action === 'leave'
      ? t('chat.info.leaveGroupConfirm', '确定退出该群聊吗？')
      : t('chat.info.destroyGroupConfirm', '确定解散该群聊吗？'),
    action,
  }
}

async function onConfirmAction() {
  const action = confirmModal.value.action
  confirmModal.value.show = false
  if (!action)
    return
  try {
    if (action === 'leave') {
      await leaveGroup(props.groupId)
      showToast(t('chat.info.leaveGroupSuccess', '已退出群聊'), 'success')
    }
    else {
      await destroyGroup(props.groupId)
      showToast(t('chat.info.destroyGroupSuccess', '群聊已解散'), 'success')
    }
    // 退出/解散后删除对应会话与消息缓存（参照 chat.vue onLeaveGroup/onDestroyGroup）
    stores.conversation.deleteConversation(props.groupId)
    stores.message.clearConversationMessages(props.groupId)
    if (action === 'leave')
      emit('leaved', props.groupId)
    else
      emit('destroyed', props.groupId)
  }
  catch (err) {
    logger.warn('[GroupDetail] leave/destroy group failed:', formatSdkError(err))
    showToast(
      action === 'leave'
        ? t('chat.info.leaveGroupFailed', '退出群聊失败')
        : t('chat.info.destroyGroupFailed', '解散群聊失败'),
      'error',
    )
  }
}
</script>

<template>
  <div class="group-detail">
    <div class="group-detail__wrapper">
      <div v-if="loading" class="group-detail__loading">
        {{ t('common.loading', '加载中...') }}
      </div>

      <div class="group-detail__header">
        <!-- 插槽 #avatar：接管群头像区 / Slot #avatar: override the avatar block -->
        <slot name="avatar" :group-id="props.groupId" :avatar="displayAvatar" :display-name="displayName">
          <Avatar
            :src="displayAvatar"
            :name="displayName"
            :size="96"
          />
        </slot>
        <!-- 插槽 #header：接管群名（含编辑）与 GroupID 信息区；接管后内置改名不再渲染 / Slot #header: override name & meta lines -->
        <slot name="header" :group-id="props.groupId" :display-name="displayName" :is-owner="isOwner" :group="displayGroup">
          <div class="group-detail__name">
            <span>{{ displayName }}</span>
            <IconButton
              v-if="isOwner"
              icon="rect_notched/pen"
              :icon-size="22"
              :style="{ color: '#C9CDCF' }"
              :title="t('chat.info.edit', '编辑')"
              @click="startEditName"
            />
          </div>
          <div class="group-detail__meta">
            {{ t('groupCard.groupId', '群 ID') }}: {{ props.groupId }}
          </div>
        </slot>
      </div>

      <!-- 插槽 #extra：在头部与操作按钮之间插入自定义内容（如群介绍、成员数） / Slot #extra: insert custom content between header and actions -->
      <slot name="extra" :group-id="props.groupId" :group="displayGroup" />

      <!-- 插槽 #actions：接管 Chat 胶囊按钮区 / Slot #actions: override the chat action -->
      <slot name="actions" :group-id="props.groupId">
        <button class="group-detail__pill" type="button" @click="emit('send-message', props.groupId)">
          <Icon name="bubble/empty" :size="22" />
          <span>{{ t('userCard.chat', '发消息') }}</span>
        </button>
      </slot>

      <!-- 插槽 #footer：接管退出/解散按钮区 / Slot #footer: override leave/destroy buttons -->
      <slot name="footer" :group-id="props.groupId" :is-owner="isOwner" :group="displayGroup">
        <div class="group-detail__footer">
          <button
            v-if="isOwner"
            class="group-detail__action group-detail__action--danger"
            type="button"
            @click="openConfirm('destroy')"
          >
            {{ t('group.detail.destroyGroup', '解散该群') }}
          </button>
          <button
            v-else
            class="group-detail__action"
            type="button"
            @click="openConfirm('leave')"
          >
            {{ t('group.detail.leaveGroup', '退出该群') }}
          </button>
        </div>
      </slot>
    </div>

    <Modal
      v-model:show="confirmModal.show"
      type="warning"
      content-align="center"
      :confirm-text="t('button.confirm', '确认')"
      :cancel-text="t('button.cancel', '取消')"
      @confirm="onConfirmAction"
      @cancel="confirmModal.show = false"
    >
      {{ confirmModal.content }}
    </Modal>

    <!-- 群名称编辑弹窗 -->
    <Modal
      v-model:show="nameModalShow"
      :title="t('chat.info.groupName', '群名称')"
      :confirm-text="t('button.confirm', '确认')"
      :cancel-text="t('button.cancel', '取消')"
      @confirm="saveName"
      @cancel="cancelEditName"
    >
      <input
        ref="nameInputRef"
        v-model="nameInput"
        class="group-detail__name-input"
        type="text"
        :disabled="savingName"
        :placeholder="t('chat.info.groupName', '群名称')"
        @keyup.enter="saveName"
      >
    </Modal>
  </div>
</template>

<style scoped>
.group-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 80px 24px 40px;
  box-sizing: border-box;
  background-color: var(--uikit-bg-base);
  overflow-y: auto;
}

.group-detail__wrapper {
  position: relative;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
}

.group-detail__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-tertiary);
  font-size: var(--uikit-font-size-14);
  z-index: 1;
}

.group-detail__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.group-detail__name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  font-size: var(--uikit-font-size-20);
  font-weight: 600;
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.group-detail__meta {
  margin-top: 4px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
  word-break: break-all;
}

.group-detail__pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 44px;
  margin-top: 32px;
  border: none;
  border-radius: 999px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-primary-color);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
}

.group-detail__pill:hover {
  opacity: 0.85;
}

.group-detail__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 64px;
}

.group-detail__action {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 999px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
}

.group-detail__action:hover {
  opacity: 0.85;
}

.group-detail__action--danger {
  color: var(--uikit-danger-color);
}

/* 群名称编辑弹窗输入框 */
.group-detail__name-input {
  width: 100%;
  box-sizing: border-box;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 6px);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  outline: none;
}

.group-detail__name-input:focus {
  border-color: var(--uikit-primary-color, #3b82f6);
}

@media (max-width: 640px) {
  .group-detail {
    padding: 24px 16px;
  }

  .group-detail__footer {
    margin-top: 32px;
  }
}
</style>
