<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UserInfoAttribute } from 'easemob-websdk'
import { formatSdkError } from '../../utils/sdk-error'
import Popup from '../popup/popup.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useUserInfo } from '../../composables/use-user-info'
import { usePresence } from '../../composables/use-presence'
import { useBlocklist } from '../../composables/use-blocklist'
import { useToast } from '../../composables/use-toast'
import type { PresenceDisplayStatus } from '../avatar/avatar.vue'
import UserCard, { type UserCardInfoRow } from './user-card.vue'
import { createLogger } from '../../utils/logger'

const logger = createLogger('UIKit:UserCardModal')

export interface UserCardModalProps {
  show: boolean
  userId: string
}

const props = defineProps<UserCardModalProps>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'send-message', userId: string): void
  (e: 'close'): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { client, stores, features } = useUIKit()
const { fetchPresence } = usePresence()
const { refresh: refreshBlocklist } = useBlocklist()

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

const { userInfo, avatarUrl, displayName } = useUserInfo(() => props.userId, attributes)

const presenceLoading = ref(false)
const loading = computed(() => {
  if (!props.userId)
    return false
  return stores.userInfo.isLoading(props.userId) || presenceLoading.value
})
const presenceStatus = ref<PresenceDisplayStatus | undefined>(undefined)

const isSelf = computed(() => stores.client.currentUser === props.userId)

watch(
  () => props.show,
  (show) => {
    if (show)
      void loadData()
  },
  { immediate: true },
)

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

const cardActions = computed(() => {
  const actions = [
    {
      key: 'message',
      label: t('userCard.message', '消息'),
      icon: 'chat/bubble_fill',
      type: 'primary' as const,
    },
    {
      key: 'voice',
      label: t('userCard.voice', '语音'),
      icon: 'audio-video/phone_pick',
      type: 'default' as const,
    },
    {
      key: 'video',
      label: t('userCard.video', '视频'),
      icon: 'audio-video/video_camera',
      type: 'default' as const,
    },
  ]

  return actions
})

const cardInfoRows = computed<UserCardInfoRow[]>(() => {
  const rows: UserCardInfoRow[] = []
  const info = userInfo.value

  if (info?.sign)
    rows.push({ key: 'signature', label: t('contact.detail.signature', '个性签名'), value: info.sign })

  if (info?.nickname)
    rows.push({ key: 'nickname', label: t('contact.detail.nickname', '昵称'), value: info.nickname })

  rows.push({ key: 'userId', label: t('contact.detail.userId', '用户 ID'), value: props.userId, copyable: true })

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

function onClose() {
  emit('update:show', false)
  emit('close')
}

function onActionClick(key: string) {
  if (key === 'message') {
    emit('send-message', props.userId)
    onClose()
  }
  else if (key === 'voice' || key === 'video') {
    showToast(t('userCard.notSupported', '暂不支持'))
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
    position="center"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onClose"
  >
    <div class="user-card-modal">
      <UserCard
        :user-id="props.userId"
        :name="displayNameValue"
        :avatar="displayAvatar"
        :status="presenceStatus"
        :editable="isSelf"
        :actions="cardActions"
        :info-rows="cardInfoRows"
        @action-click="onActionClick"
        @info-click="onInfoClick"
        @presence-changed="onPresenceChanged"
      />

      <div v-if="loading" class="user-card-modal__loading">
        {{ t('common.loading', '加载中...') }}
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.user-card-modal {
  width: 320px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  /* 移动端优先使用动态视口高度，不支持的浏览器回退到上面的 100vh */
  max-height: calc(100dvh - 64px);
  overflow-y: auto;
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
</style>
