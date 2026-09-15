<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { UserInfo, UserInfoAttribute } from '@easemob/uikit-sdk-contract'
import { EmAvatar as Avatar, EmIcon as Icon, EmIconButton as IconButton, EmModal as Modal, createLogger, formatSdkError, useLocale, usePresence, useToast } from '@easemob/uikit-core'
import type { PresenceDisplayStatus, UiContact } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'
import { useContact } from '../../composables/use-contact'
import { useBlocklist } from '../../composables/use-blocklist'

const props = withDefaults(defineProps<ContactDetailProps>(), {
  contact: null,
})

const emit = defineEmits<{
  (e: 'send-message', userId: string): void
  (e: 'deleted', userId: string): void
  (e: 'block-changed', userId: string, blocked: boolean): void
  (e: 'remark-changed', userId: string, remark: string): void
}>()

const logger = createLogger('UIKit:ContactDetail')

export interface ContactDetailProps {
  /** 联系人用户 ID */
  userId: string
  /** 外部已缓存的联系人摘要（可选，用于首屏快速展示） */
  contact?: UiContact | null
}

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
const remarkModalShow = ref(false)
const remarkInput = ref('')
const remarkInputRef = ref<HTMLInputElement>()

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

const blocked = computed(() => isBlocked(props.userId))

const remark = computed(() =>
  contactFromStore.value?.remark || props.contact?.remark || '',
)

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
    if (!remarkModalShow.value)
      remarkInput.value = r || ''
  },
  { immediate: true },
)

onMounted(() => {
  if (features.enableBlocklist && stores.contact.blackList.length === 0)
    void refreshBlocklist()
})

// 备注编辑弹窗打开后自动聚焦输入框
watch(remarkModalShow, async (show) => {
  if (show) {
    await nextTick()
    remarkInputRef.value?.focus()
  }
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
  remarkModalShow.value = true
}

async function saveRemark() {
  try {
    await setContactRemark(props.userId, remarkInput.value)
    remarkModalShow.value = false
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
  remarkModalShow.value = false
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
</script>

<template>
  <div class="contact-detail">
    <div class="contact-detail__wrapper">
      <div v-if="loading" class="contact-detail__loading">
        {{ t('common.loading', '加载中...') }}
      </div>

      <div class="contact-detail__header">
        <!-- 插槽 #avatar：接管头像区 / Slot #avatar: override the avatar block -->
        <slot name="avatar" :user-id="props.userId" :avatar="displayAvatar" :display-name="displayNameValue" :presence="presenceStatus">
          <Avatar
            :src="displayAvatar"
            :name="displayNameValue"
            :size="96"
            :presence="presenceStatus"
          />
        </slot>
        <!-- 插槽 #header：接管名称与 Username/UserID 信息区 / Slot #header: override name & meta lines -->
        <slot name="header" :user-id="props.userId" :display-name="displayNameValue" :nickname="detailUserInfo?.nickname" :presence="presenceStatus">
          <div class="contact-detail__name">
            {{ displayNameValue }}
          </div>
          <div class="contact-detail__meta">
            {{ t('userCard.username', '用户名') }}: {{ detailUserInfo?.nickname || '-' }}
          </div>
          <div class="contact-detail__meta">
            {{ t('contact.detail.userId', '用户 ID') }}: {{ props.userId }}
          </div>
        </slot>
      </div>

      <!-- 插槽 #alias：接管 User Alias（备注）行；接管后内置备注编辑入口不再渲染 / Slot #alias: override the remark row -->
      <slot name="alias" :user-id="props.userId" :remark="remark">
        <div class="contact-detail__alias">
          <div class="contact-detail__alias-main">
            <span class="contact-detail__alias-label">{{ t('userCard.alias', '备注') }}</span>
            <span class="contact-detail__alias-value">{{ remark || displayNameValue }}</span>
          </div>
          <IconButton
            icon="rect_notched/pen"
            :icon-size="22"
            :style="{ color: '#C9CDCF' }"
            :title="t('contact.detail.edit', '编辑')"
            @click="startEditRemark"
          />
        </div>
      </slot>

      <!-- 插槽 #extra：在备注行与操作按钮之间插入自定义内容 / Slot #extra: insert custom content between alias row and actions -->
      <slot name="extra" :user-id="props.userId" :user-info="detailUserInfo" :contact="contactFromStore" />

      <!-- 插槽 #actions：接管 Chat 胶囊按钮区 / Slot #actions: override the chat action -->
      <slot name="actions" :user-id="props.userId">
        <button class="contact-detail__pill" type="button" @click="emit('send-message', props.userId)">
          <Icon name="bubble/empty" :size="22" />
          <span>{{ t('userCard.chat', '发消息') }}</span>
        </button>
      </slot>

      <!-- 插槽 #footer：接管拉黑/删除按钮区 / Slot #footer: override block/delete buttons -->
      <slot name="footer" :user-id="props.userId" :blocked="blocked">
        <div class="contact-detail__footer">
          <button
            class="contact-detail__action"
            type="button"
            @click="openConfirm(blocked ? 'unblock' : 'block')"
          >
            {{ blocked ? t('contact.detail.unblock', '取消拉黑') : t('userCard.blockedContact', '拉黑联系人') }}
          </button>
          <button
            class="contact-detail__action contact-detail__action--danger"
            type="button"
            @click="openConfirm('delete')"
          >
            {{ t('userCard.deleteContact', '删除联系人') }}
          </button>
        </div>
      </slot>
    </div>

    <Modal
      v-model:show="confirmModal.show"
      :title="confirmModal.title"
      type="warning"
      content-align="center"
      :confirm-text="t('button.confirm', '确认')"
      :cancel-text="t('button.cancel', '取消')"
      @confirm="onConfirmAction"
      @cancel="confirmModal.show = false"
    >
      {{ confirmModal.content }}
    </Modal>

    <!-- 备注编辑弹窗 -->
    <Modal
      v-model:show="remarkModalShow"
      :title="t('userCard.alias', '备注')"
      :confirm-text="t('button.confirm', '确认')"
      :cancel-text="t('button.cancel', '取消')"
      @confirm="saveRemark"
      @cancel="cancelEditRemark"
    >
      <input
        ref="remarkInputRef"
        v-model="remarkInput"
        class="contact-detail__remark-input"
        type="text"
        :placeholder="t('userCard.alias', '备注')"
        @keyup.enter="saveRemark"
      >
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
  display: flex;
  flex-direction: column;
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
}

.contact-detail__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.contact-detail__name {
  margin-top: 16px;
  font-size: var(--uikit-font-size-20);
  font-weight: 600;
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.contact-detail__meta {
  margin-top: 4px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
  word-break: break-all;
}

.contact-detail__alias {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.contact-detail__alias-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-detail__alias-label {
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.contact-detail__alias-value {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.contact-detail__remark-input {
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

.contact-detail__remark-input:focus {
  border-color: var(--uikit-primary-color, #3b82f6);
}

.contact-detail__pill {
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

.contact-detail__pill:hover {
  opacity: 0.85;
}

.contact-detail__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 64px;
}

.contact-detail__action {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 999px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  cursor: pointer;
}

.contact-detail__action:hover {
  opacity: 0.85;
}

.contact-detail__action--danger {
  color: var(--uikit-danger-color);
}

@media (max-width: 640px) {
  .contact-detail {
    padding: 24px 16px;
  }

  .contact-detail__footer {
    margin-top: 32px;
  }
}
</style>
