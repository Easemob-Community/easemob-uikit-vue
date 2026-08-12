<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { UserInfo, UserInfoAttribute } from 'easemob-websdk'
import { onClickOutside } from '@vueuse/core'
import { formatSdkError } from '../../utils/sdk-error'
import IconButton from '../../components/icon-button/icon-button.vue'
import Modal from '../../components/modal/modal.vue'
import UserCard from '../../components/user-card/user-card.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'
import { useContact } from '../../composables/use-contact'
import { useBlocklist } from '../../composables/use-blocklist'
import { usePresence } from '../../composables/use-presence'
import { useToast } from '../../composables/use-toast'
import type { UiContact } from '../../sdk/types'
import type { PresenceDisplayStatus } from '../../components/avatar/avatar.vue'
import type { UserCardAction } from '../../components/user-card/user-card.vue'
import { createLogger } from '../../utils/logger'

const logger = createLogger('UIKit:ContactDetail')

export interface ContactDetailProps {
  /** 联系人用户 ID */
  userId: string
  /** 外部已缓存的联系人摘要（可选，用于首屏快速展示） */
  contact?: UiContact | null
}

const props = withDefaults(defineProps<ContactDetailProps>(), {
  contact: null,
})

const emit = defineEmits<{
  (e: 'send-message', userId: string): void
  (e: 'deleted', userId: string): void
  (e: 'block-changed', userId: string, blocked: boolean): void
  (e: 'remark-changed', userId: string, remark: string): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { client, stores, features } = useUIKit()
const { deleteContact, setContactRemark } = useContact()
const { isBlocked, addBlock, removeBlock, refresh: refreshBlocklist } = useBlocklist()
const { fetchPresence } = usePresence()

const attributes: UserInfoAttribute[] = [
  'nickname',
  'avatarUrl',
  'sign',
  'gender',
  'birth',
  'phone',
  'mail',
  'ext',
]

const { userInfo, contact: contactFromStore, avatarUrl, displayName } = useUserInfo(() => props.userId, attributes)

const presenceStatus = ref<PresenceDisplayStatus | undefined>(undefined)
const presenceLoading = ref(false)
const loading = computed(() => {
  if (!props.userId)
    return false
  // 若已有缓存资料，切换时不显示 loading，避免卡片闪动
  const hasUserInfo = !!stores.userInfo.getUserInfo(props.userId)
  if (hasUserInfo)
    return presenceLoading.value
  return stores.userInfo.isLoading(props.userId) || presenceLoading.value
})
const isSelf = computed(() => stores.client.currentUser === props.userId)
const isEditingRemark = ref(false)
const remarkInput = ref('')
const remarkEditRef = ref<HTMLElement>()
const remarkInputRef = ref<HTMLInputElement>()
let stopClickOutside: (() => void) | null = null

const confirmModal = ref<{
  show: boolean
  title: string
  content: string
  action: 'delete' | 'block' | 'unblock' | null
}>({
  show: false,
  title: '',
  content: '',
  action: null,
})

const detailUserInfo = computed<UserInfo | undefined>(() => userInfo.value)

const displayAvatar = computed(() =>
  avatarUrl.value || props.contact?.avatar || detailUserInfo.value?.avatarUrl,
)

const displayNameValue = computed(() =>
  displayName.value || props.contact?.name || props.userId,
)

const signature = computed(() =>
  detailUserInfo.value?.sign || props.contact?.signature || '',
)

const remark = computed(() =>
  contactFromStore.value?.remark || props.contact?.remark || '',
)

const cardActions = computed<UserCardAction[]>(() => {
  const blocked = isBlocked(props.userId)
  return [
    {
      key: 'message',
      label: t('contact.detail.sendMessage', '发消息'),
      icon: 'chat/bubble_fill',
      type: 'primary',
    },
    {
      key: blocked ? 'unblock' : 'block',
      label: blocked
        ? (t('contact.detail.unblock', '取消拉黑'))
        : (t('contact.detail.block', '拉黑')),
      icon: 'actions/ban',
      type: blocked ? 'danger' : 'primary',
    },
    {
      key: 'delete',
      label: t('contact.detail.deleteContact', '删除好友'),
      icon: 'actions/trash',
      type: 'danger',
    },
  ]
})

const cardInfoRows = computed(() => {
  const rows: { key: string, label: string, value: string }[] = []
  if (signature.value)
    rows.push({ key: 'signature', label: t('contact.detail.signature', '个性签名'), value: signature.value })
  if (detailUserInfo.value?.nickname)
    rows.push({ key: 'nickname', label: t('contact.detail.nickname', '昵称'), value: detailUserInfo.value.nickname })
  rows.push({ key: 'userId', label: t('contact.detail.userId', '用户 ID'), value: props.userId })
  return rows
})

watch(
  () => props.userId,
  () => {
    void loadData()
  },
  { immediate: true },
)

watch(
  () => remark.value,
  (r) => {
    if (!isEditingRemark.value)
      remarkInput.value = r || ''
  },
  { immediate: true },
)

onMounted(() => {
  if (features.enableBlocklist && stores.contact.blackList.length === 0)
    void refreshBlocklist()
})

watch(
  isEditingRemark,
  (editing) => {
    if (editing) {
      void nextTick(() => {
        remarkInputRef.value?.focus()
        stopClickOutside = onClickOutside(remarkEditRef, () => {
          cancelEditRemark()
        })
      })
    }
    else {
      stopClickOutside?.()
      stopClickOutside = null
    }
  },
)

onUnmounted(() => {
  stopClickOutside?.()
})

async function loadData() {
  if (!props.userId || !client.value)
    return
  presenceLoading.value = true
  try {
    if (features.enablePresence) {
      try {
        const presences = await fetchPresence([props.userId])
        presenceStatus.value = presences[0]?.status as PresenceDisplayStatus | undefined
      }
      catch (err) {
        logger.warn('[ContactDetail] fetch presence failed:', formatSdkError(err))
      }
    }
  }
  finally {
    presenceLoading.value = false
  }
}

function startEditRemark() {
  remarkInput.value = remark.value
  isEditingRemark.value = true
}

async function saveRemark() {
  try {
    await setContactRemark(props.userId, remarkInput.value)
    isEditingRemark.value = false
    emit('remark-changed', props.userId, remarkInput.value)
    showToast(t('contact.detail.remarkSaved', '备注已保存'), 'success')
  }
  catch (err) {
    logger.warn('[ContactDetail] save remark failed:', formatSdkError(err))
    showToast(t('contact.detail.remarkSaveFailed', '备注保存失败'), 'error')
  }
}

function cancelEditRemark() {
  remarkInput.value = remark.value
  isEditingRemark.value = false
}

function openConfirm(action: 'delete' | 'block' | 'unblock') {
  const contents: Record<string, string> = {
    delete: t('contact.detail.deleteContactConfirm', '确定删除该联系人？'),
    block: t('contact.detail.blockConfirm', '确定拉黑该联系人？'),
    unblock: t('contact.detail.unblockConfirm', '确定取消拉黑？'),
  }
  confirmModal.value = {
    show: true,
    title: '',
    content: contents[action],
    action,
  }
}

async function onConfirmAction() {
  const action = confirmModal.value.action
  confirmModal.value.show = false
  if (!action)
    return
  try {
    if (action === 'delete') {
      await deleteContact(props.userId)
      showToast(t('contact.detail.deleteContactSuccess', '已删除联系人'), 'success')
      emit('deleted', props.userId)
    }
    else if (action === 'block') {
      await addBlock({
        userId: props.userId,
        name: displayNameValue.value,
        avatar: displayAvatar.value || '',
      })
      showToast(t('contact.detail.blockSuccess', '已拉黑'), 'success')
      emit('block-changed', props.userId, true)
    }
    else if (action === 'unblock') {
      await removeBlock(props.userId)
      showToast(t('contact.detail.unblockSuccess', '已取消拉黑'), 'success')
      emit('block-changed', props.userId, false)
    }
  }
  catch (err) {
    logger.warn('[ContactDetail] action failed:', formatSdkError(err))
    showToast(t('contact.detail.actionFailed', '操作失败'), 'error')
  }
}

function onCardAction(key: string) {
  if (key === 'message')
    emit('send-message', props.userId)
  else if (key === 'block')
    openConfirm('block')
  else if (key === 'unblock')
    openConfirm('unblock')
  else if (key === 'delete')
    openConfirm('delete')
}

function onCardInfoClick(_key: string) {
  // 信息行暂无跳转
}

function onPresenceChanged() {
  if (features.enablePresence && isSelf.value)
    void loadData()
}
</script>

<template>
  <div class="contact-detail">
    <div class="contact-detail__wrapper">
      <div v-if="loading" class="contact-detail__loading">
        {{ t('common.loading', '加载中...') }}
      </div>

      <UserCard
        :user-id="props.userId"
        :name="displayNameValue"
        :avatar="displayAvatar"
        :status="presenceStatus"
        :editable="isSelf"
        :actions="cardActions"
        :info-rows="cardInfoRows"
        @action-click="onCardAction"
        @info-click="onCardInfoClick"
        @presence-changed="onPresenceChanged"
      >
        <div class="contact-detail__extra">
          <div class="contact-detail__row">
            <span class="contact-detail__label">{{ t('contact.detail.remark', '备注') }}</span>
            <div v-if="isEditingRemark" ref="remarkEditRef" class="contact-detail__remark-edit">
              <input
                ref="remarkInputRef"
                v-model="remarkInput"
                class="contact-detail__remark-input"
                type="text"
                @keyup.enter="saveRemark"
                @keyup.esc="cancelEditRemark"
              >
              <IconButton
                icon="actions/check"
                size="small"
                type="success"
                :title="t('button.confirm', '确认')"
                @click="saveRemark"
              />
              <IconButton
                icon="actions/xmark_thick"
                size="small"
                type="danger"
                :title="t('button.cancel', '取消')"
                @click="cancelEditRemark"
              />
            </div>
            <template v-else>
              <span class="contact-detail__value">{{ remark || '-' }}</span>
              <IconButton
                icon="actions/edit"
                size="small"
                type="primary"
                :title="t('contact.detail.edit', '编辑')"
                @click="startEditRemark"
              />
            </template>
          </div>

          <div v-if="detailUserInfo?.gender" class="contact-detail__row">
            <span class="contact-detail__label">{{ t('contact.detail.gender', '性别') }}</span>
            <span class="contact-detail__value">{{ detailUserInfo.gender }}</span>
          </div>

          <div v-if="detailUserInfo?.birth" class="contact-detail__row">
            <span class="contact-detail__label">{{ t('contact.detail.birth', '生日') }}</span>
            <span class="contact-detail__value">{{ detailUserInfo.birth }}</span>
          </div>

          <div v-if="detailUserInfo?.phone" class="contact-detail__row">
            <span class="contact-detail__label">{{ t('contact.detail.phone', '电话') }}</span>
            <span class="contact-detail__value">{{ detailUserInfo.phone }}</span>
          </div>

          <div v-if="detailUserInfo?.mail" class="contact-detail__row">
            <span class="contact-detail__label">{{ t('contact.detail.mail', '邮箱') }}</span>
            <span class="contact-detail__value">{{ detailUserInfo.mail }}</span>
          </div>
        </div>
      </UserCard>
    </div>

    <Modal
      v-model:show="confirmModal.show"
      :title="confirmModal.title"
      :confirm-text="t('button.confirm', '确认')"
      :cancel-text="t('button.cancel', '取消')"
      @confirm="onConfirmAction"
      @cancel="confirmModal.show = false"
    >
      {{ confirmModal.content }}
    </Modal>
  </div>
</template>

<style scoped>
.contact-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 80px 24px 40px;
  box-sizing: border-box;
  background-color: var(--uikit-bg-base);
  overflow-y: auto;
}

.contact-detail__wrapper {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.contact-detail__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-tertiary);
  font-size: var(--uikit-font-size-14);
  z-index: 1;
  border-radius: var(--uikit-components-radius, 12px);
}

.contact-detail__extra {
  margin-top: 4px;
  padding: 0 0 20px;
  background-color: var(--uikit-bg-base);
  border-radius: 0 0 var(--uikit-components-radius, 12px) var(--uikit-components-radius, 12px);
}

.contact-detail__row {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0;
  gap: 16px;
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
  overflow: hidden;
}

.contact-detail__row:last-child {
  border-bottom: none;
}

.contact-detail__label {
  flex: 0 0 80px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.contact-detail__value {
  flex: 1;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.contact-detail__remark-edit {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 360px) {
  .contact-detail__remark-edit {
    flex-wrap: wrap;
  }

  .contact-detail__remark-edit .contact-detail__remark-input {
    flex: 1 1 100%;
  }

  .contact-detail__remark-edit :deep(.uikit-icon-button) {
    flex-shrink: 0;
  }
}

.contact-detail__remark-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 6px);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  outline: none;
}

.contact-detail__remark-input:focus {
  border-color: var(--uikit-primary-color, #3b82f6);
}

@media (max-width: 640px) {
  .contact-detail {
    padding: 24px 16px;
  }
}
</style>
