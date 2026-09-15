<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { UserInfoAttribute } from '@easemob/uikit-sdk-contract'
import type { PresenceDisplayStatus, UserCardAction, UserCardInfoRow } from '@easemob/uikit-core'
import { EmIcon as Icon, EmIconButton as IconButton, EmModal as Modal, EmPopup as Popup, EmUserCard as UserCard, createLogger, formatSdkError, useLocale, usePresence, useToast, useViewport } from '@easemob/uikit-core'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'
import { useContact } from '../../composables/use-contact'
import { useBlocklist } from '../../composables/use-blocklist'

export interface UserCardModalProps {
  show: boolean
  userId: string
  /** 是否展示语音通话入口（SDK 无 RTC 能力，点击仅抛 audio-call 事件由消费方接管），默认 false */
  enableAudioAction?: boolean
  /** 是否展示视频通话入口（SDK 无 RTC 能力，点击仅抛 video-call 事件由消费方接管），默认 false */
  enableVideoAction?: boolean
  /** 联系人档是否展示备注（User Alias）编辑区，默认 true */
  showAlias?: boolean
  /** 锚定触发元素：传入后名片相对该元素无遮罩弹出（仅桌面端，移动端回落为底部抽屉）；不传维持居中弹窗 */
  anchor?: HTMLElement
  /** 相对锚点的位置，默认 'right'（仅锚定模式生效，边界不足时自动翻转） */
  placement?: 'bottom' | 'top' | 'left' | 'right'
  /** 锚定轴上的对齐方式，默认 'start'（仅锚定模式生效） */
  align?: 'start' | 'center' | 'end'
  /** 与锚点的间距（px），默认 8（仅锚定模式生效） */
  offset?: number
}

const props = withDefaults(defineProps<UserCardModalProps>(), {
  enableAudioAction: false,
  enableVideoAction: false,
  showAlias: true,
  placement: 'right',
  align: 'start',
  offset: 8,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'send-message', userId: string): void
  /** 陌生人档点击「加好友」且申请发送成功后触发 */
  (e: 'contact-added', userId: string): void
  /** 删除联系人成功后触发 */
  (e: 'deleted', userId: string): void
  /** 拉黑/取消拉黑成功后触发 */
  (e: 'block-changed', userId: string, blocked: boolean): void
  /** 备注保存成功后触发 */
  (e: 'remark-changed', userId: string, remark: string): void
  /** 点击语音通话入口时触发（需 enableAudioAction 开启，通话能力由消费方实现） */
  (e: 'audio-call', userId: string): void
  /** 点击视频通话入口时触发（需 enableVideoAction 开启，通话能力由消费方实现） */
  (e: 'video-call', userId: string): void
  (e: 'close'): void
}>()

const logger = createLogger('UIKit:UserCardModal')

const { t } = useLocale()
const { show: showToast } = useToast()
const { client, stores, features } = useUIKit()
const { fetchPresence } = usePresence()
const { addContact, deleteContact, setContactRemark } = useContact()
const { isBlocked, addBlock, removeBlock, refresh: refreshBlocklist } = useBlocklist()
const { isMobile } = useViewport()

/** 桌面端且传了 anchor 时走无遮罩锚定弹出；移动端一律回落为底部抽屉（锚定体验差） */
const useAnchored = computed(() => !!props.anchor && !isMobile.value)

const rootRef = ref<HTMLElement>()

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

const { userInfo, contact, avatarUrl, displayName } = useUserInfo(() => props.userId, attributes)

const presenceLoading = ref(false)
const loading = computed(() => {
  if (!props.userId)
    return false
  return stores.userInfo.isLoading(props.userId) || presenceLoading.value
})
const presenceStatus = ref<PresenceDisplayStatus | undefined>(undefined)

const isSelf = computed(() => stores.client.currentUser === props.userId)
/** 是否为好友（决定三档形态：好友档 / 陌生人档） */
const isContact = computed(() => !!contact.value)
/** 好友是否已设置备注（档1 有备注 / 档2 无备注） */
const remark = computed(() => contact.value?.remark || '')

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

const isEditingRemark = ref(false)
const remarkInput = ref('')
const remarkEditRef = ref<HTMLElement>()
const remarkInputRef = ref<HTMLInputElement>()
let stopClickOutside: (() => void) | null = null

watch(
  () => props.show,
  (show) => {
    if (show)
      void loadData()
    else
      cancelEditRemark()
  },
  { immediate: true },
)

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
        logger.warn('[UserCardModal] fetch presence failed:', formatSdkError(err))
      }
    }

    if (features.enableBlocklist && stores.contact.blackList.length === 0)
      await refreshBlocklist()
  }
  finally {
    presenceLoading.value = false
  }
}

/** 好友档操作区有多个小胶囊（Chat/Audio/Video）时横向一排，否则 Chat 整宽独占一行 */
const hasCallActions = computed(() => props.enableAudioAction || props.enableVideoAction)

const cardActions = computed<UserCardAction[]>(() => {
  const actions: UserCardAction[] = []

  if (isSelf.value) {
    actions.push({
      key: 'message',
      label: t('userCard.message', '消息'),
      icon: 'bubble/rect/empty',
      type: 'primary',
      block: true,
    })
    return actions
  }

  if (isContact.value) {
    actions.push({
      key: 'message',
      label: t('userCard.chat', '发消息'),
      icon: 'bubble/rect/empty',
      type: 'primary',
      block: !hasCallActions.value,
    })
    if (props.enableAudioAction) {
      actions.push({
        key: 'audio',
        label: t('userCard.audio', '语音通话'),
        icon: 'phone',
        type: 'primary',
      })
    }
    if (props.enableVideoAction) {
      actions.push({
        key: 'video',
        label: t('userCard.video', '视频'),
        icon: 'video',
        type: 'primary',
      })
    }
    if (features.enableBlocklist) {
      const blocked = isBlocked(props.userId)
      actions.push({
        key: blocked ? 'unblock' : 'block',
        label: blocked
          ? t('contact.detail.unblock', '取消拉黑')
          : t('userCard.blockedContact', '拉黑联系人'),
        type: 'default',
        block: true,
      })
    }
    if (features.enableContact) {
      actions.push({
        key: 'delete',
        label: t('userCard.deleteContact', '删除联系人'),
        type: 'danger',
        block: true,
      })
    }
  }
  else if (features.enableContact) {
    actions.push({
      key: 'add-contact',
      label: t('userCard.sendContactRequest', '加好友'),
      type: 'primary',
      block: true,
    })
  }

  if (!isContact.value && features.enableBlocklist) {
    const blocked = isBlocked(props.userId)
    actions.push({
      key: blocked ? 'unblock' : 'block',
      label: blocked
        ? t('contact.detail.unblock', '取消拉黑')
        : t('userCard.blocked', '拉黑'),
      type: 'default',
      block: true,
    })
  }

  return actions
})

const cardInfoRows = computed<UserCardInfoRow[]>(() => {
  const rows: UserCardInfoRow[] = []
  const info = userInfo.value

  if (info?.sign)
    rows.push({ key: 'signature', label: t('contact.detail.signature', '个性签名'), value: info.sign })

  // 用户 ID 已在 UserCard 顶部固定展示，infoRows 中不再重复；昵称走名称/副标题区，不单独成行

  try {
    const ext = info?.ext ? (JSON.parse(info.ext) as Record<string, string>) : {}
    if (ext.calendar)
      rows.push({ key: 'calendar', label: t('userCard.calendar', '日历'), value: ext.calendar, clickable: true })
    if (ext.department)
      rows.push({ key: 'department', label: t('userCard.department', '部门'), value: ext.department, clickable: true })
  }
  catch {
    // ext 不是 JSON 时忽略
  }

  return rows
})

const displayAvatar = computed(() => avatarUrl.value || userInfo.value?.avatarUrl)
const displayNameValue = computed(() => displayName.value || userInfo.value?.nickname || props.userId)
/** 档1（好友+有备注）：大名字展示备注，昵称下移到 Username 副标题行 */
const subtitle = computed(() => {
  if (!remark.value || !userInfo.value?.nickname)
    return undefined
  return `${t('userCard.username', '用户名')}: ${userInfo.value.nickname}`
})
const showAliasSection = computed(() =>
  props.showAlias && isContact.value && !isSelf.value && features.enableContact,
)

function onClose() {
  // Popup 的 close 事件已经携带了 update:show(false)，此处不再重复 emit，避免消费者收到两次
  emit('close')
}

function closeModal() {
  emit('update:show', false)
  onClose()
}

// 锚定模式下，名片外部任何滚动都关闭名片：锚点被虚拟滚动回收后继续跟随定位已无意义。
// 名片自身内部滚动（event.target 在 rootRef 内）不关闭。
useEventListener(window, 'scroll', (event: Event) => {
  if (!props.show || !useAnchored.value)
    return
  if (rootRef.value?.contains(event.target as Node))
    return
  closeModal()
}, { capture: true })

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
    logger.warn('[UserCardModal] save remark failed:', formatSdkError(err))
    showToast(t('contact.detail.remarkSaveFailed', '备注保存失败'), 'error')
  }
}

function cancelEditRemark() {
  if (!isEditingRemark.value)
    return
  remarkInput.value = remark.value
  isEditingRemark.value = false
}

function openConfirm(action: 'delete' | 'block' | 'unblock') {
  const contents: Record<string, string> = {
    delete: t('contact.detail.deleteContactConfirm', '确定删除该联系人吗？'),
    block: t('contact.detail.blockConfirm', '确定拉黑该联系人吗？'),
    unblock: t('contact.detail.unblockConfirm', '确定取消拉黑吗？'),
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
      closeModal()
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
    logger.warn('[UserCardModal] action failed:', formatSdkError(err))
    showToast(t('contact.detail.actionFailed', '操作失败'), 'error')
  }
}

async function onAddContact() {
  try {
    await addContact(props.userId)
    showToast(t('userCard.addContactSuccess', '好友申请已发送'), 'success')
    emit('contact-added', props.userId)
  }
  catch (err) {
    logger.warn('[UserCardModal] add contact failed:', formatSdkError(err))
    showToast(t('userCard.addContactFailed', '好友申请发送失败'), 'error')
  }
}

function onActionClick(key: string) {
  if (key === 'message') {
    emit('send-message', props.userId)
    onClose()
  }
  else if (key === 'audio') {
    emit('audio-call', props.userId)
  }
  else if (key === 'video') {
    emit('video-call', props.userId)
  }
  else if (key === 'add-contact') {
    void onAddContact()
  }
  else if (key === 'delete' || key === 'block' || key === 'unblock') {
    openConfirm(key)
  }
}

function onInfoClick(key: string) {
  if (key === 'calendar')
    showToast(t('userCard.viewCalendar', '查看日程'))
  else if (key === 'department')
    showToast(t('userCard.department', '部门'))
}

function onPresenceChanged() {
  // 变更后重新拉取自己的状态
  if (features.enablePresence && isSelf.value)
    void loadData()
}
</script>

<template>
  <Popup
    :show="props.show"
    :position="isMobile ? 'bottom' : 'center'"
    :anchor="useAnchored ? props.anchor : undefined"
    :placement="props.placement"
    :align="props.align"
    :offset="props.offset"
    :overlay="!useAnchored"
    :shell="isMobile"
    group="user-card"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onClose"
  >
    <div
      ref="rootRef"
      class="user-card-modal"
      :class="{ 'user-card-modal--sheet': isMobile }"
    >
      <UserCard
        :user-id="props.userId"
        :name="displayNameValue"
        :avatar="displayAvatar"
        layout="plain"
        :subtitle="subtitle"
        :user-id-label="t('contact.detail.userId', '用户 ID')"
        :user-id-copyable="false"
        :status="presenceStatus"
        :editable="isSelf"
        :actions="cardActions"
        :info-rows="cardInfoRows"
        @action-click="onActionClick"
        @info-click="onInfoClick"
        @presence-changed="onPresenceChanged"
      >
        <!-- User Alias（备注）编辑区，注入 UserCard 的 #meta-extra（profile 之后、actions 之前） -->
        <template #meta-extra>
          <div v-if="showAliasSection" class="user-card-modal__alias">
            <div class="user-card-modal__alias-main">
              <span class="user-card-modal__alias-label">{{ t('userCard.alias', '备注') }}</span>
              <div v-if="isEditingRemark" ref="remarkEditRef" class="user-card-modal__alias-edit">
                <input
                  ref="remarkInputRef"
                  v-model="remarkInput"
                  class="user-card-modal__alias-input"
                  type="text"
                  @keyup.enter="saveRemark"
                  @keyup.esc="cancelEditRemark"
                >
                <IconButton
                  icon="check/single"
                  size="small"
                  type="success"
                  :title="t('button.confirm', '确认')"
                  @click="saveRemark"
                />
                <IconButton
                  icon="xmark/bold"
                  size="small"
                  type="danger"
                  :title="t('button.cancel', '取消')"
                  @click="cancelEditRemark"
                />
              </div>
              <span
                v-else
                class="user-card-modal__alias-value"
                :class="{ 'is-empty': !remark }"
              >{{ remark || t('userCard.noValue', '暂无') }}</span>
            </div>
            <button
              v-if="!isEditingRemark"
              type="button"
              class="user-card-modal__alias-edit-btn"
              :title="t('contact.detail.edit', '编辑')"
              @click="startEditRemark"
            >
              <Icon name="rect_notched/pen" :size="22" :style="{ color: '#C9CDCF' }" />
            </button>
          </div>
        </template>
      </UserCard>

      <div v-if="loading" class="user-card-modal__loading">
        {{ t('common.loading', '加载中...') }}
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
    </div>
  </Popup>
</template>

<style scoped>
.user-card-modal {
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  /* 移动端优先使用动态视口高度，不支持的浏览器回退到上面的 100vh */
  max-height: calc(100dvh - 64px);
  overflow-y: auto;
}

/* 设计稿外壳：16px 圆角 + 指定投影（Popup 外壳已通过 shell=false 关闭，视觉由卡片承担） */
.user-card-modal :deep(.user-card) {
  border-radius: 16px;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.12);
}

.user-card-modal :deep(.user-card__body) {
  padding: 24px;
}

/* 移动端底部抽屉模式：通栏宽度，卡片视觉交还 Popup 外壳 */
.user-card-modal--sheet {
  width: 100%;
  max-width: 100%;
}

.user-card-modal--sheet :deep(.user-card) {
  border-radius: 0;
  box-shadow: none;
}

.user-card-modal__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  color: var(--uikit-text-secondary);
  font-size: var(--uikit-font-size-14);
  border-radius: var(--uikit-components-radius, 12px);
}

.user-card-modal__alias {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 20px;
}

.user-card-modal__alias-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-card-modal__alias-label {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}

.user-card-modal__alias-value {
  font-size: var(--uikit-font-size-16);
  font-weight: 600;
  color: var(--uikit-text-primary);
  word-break: break-all;
}

.user-card-modal__alias-value.is-empty {
  font-size: var(--uikit-font-size-14);
  font-weight: 400;
  color: var(--uikit-text-tertiary);
}

.user-card-modal__alias-edit-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
}

.user-card-modal__alias-edit {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.user-card-modal__alias-input {
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

.user-card-modal__alias-input:focus {
  border-color: var(--uikit-primary-color, #3b82f6);
}
</style>
