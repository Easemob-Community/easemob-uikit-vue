<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  EmAvatar as Avatar,
  EmEmpty as Empty,
  EmIcon as Icon,
  type UiContactInvite,
  createLogger,
  formatSdkError,
  useLocale,
  useToast,
} from '@easemob/uikit-core'
import { useContact } from '../../composables/use-contact'
import { useGroup } from '../../composables/use-group'
import { useUIKit } from '../../composables/use-uikit'
import { type InvitePersistType, useInvitePersistence } from '../../composables/use-invite-persistence'

const props = withDefaults(defineProps<ContactNoticeListProps>(), {
  invites: undefined,
  loading: false,
  persist: false,
})

const emit = defineEmits<{
  (e: 'accept', invite: UiContactInvite): void
  (e: 'decline', invite: UiContactInvite): void
}>()

const logger = createLogger('UIKit:ContactNoticeList')

export interface ContactNoticeListProps {
  invites?: UiContactInvite[]
  loading?: boolean
  /** 是否持久化未处理通知（true = localStorage，或指定 'local' / 'session'） */
  persist?: InvitePersistType
}

useInvitePersistence(computed(() => props.persist))

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { inviteList, acceptContactInvite, declineContactInvite } = useContact()
const { acceptGroupInvitation, declineGroupInvitation } = useGroup()

const displayInvites = computed(() => props.invites ?? inviteList.value)

const processingIds = ref<Set<string>>(new Set())

function isProcessing(invite: UiContactInvite): boolean {
  return processingIds.value.has(invite.id)
}

/** 我发出的申请被对方拒绝（Figma「新-Demo」2772:28346：粉色失望头像 + 「拒绝了你的好友申请」） */
function isDeclinedByPeer(invite: UiContactInvite): boolean {
  return invite.outgoing === true && invite.status === 'declined'
}

function isAlreadyAccepted(invite: UiContactInvite): boolean {
  if (invite.status !== 'pending')
    return false
  if (invite.type === 'contact') {
    return invite.userId ? stores.contact.getContact(invite.userId) !== undefined : false
  }
  if (invite.type === 'group') {
    return invite.groupId ? stores.group.getGroupById(invite.groupId) !== undefined : false
  }
  return false
}

function effectiveStatus(invite: UiContactInvite): UiContactInvite['status'] {
  if (isAlreadyAccepted(invite))
    return 'accepted'
  return invite.status
}

async function onAccept(invite: UiContactInvite) {
  if (processingIds.value.has(invite.id))
    return
  processingIds.value.add(invite.id)
  try {
    if (invite.type === 'group' && invite.groupId) {
      await acceptGroupInvitation(invite.groupId)
    }
    else if (invite.userId) {
      await acceptContactInvite(invite.userId)
    }
    showToast(t('contact.inviteAccepted', '已接受'), 'success')
    emit('accept', invite)
  }
  catch (err) {
    logger.warn('[ContactNoticeList] accept invite failed:', formatSdkError(err))
    showToast(t('contact.inviteAcceptFailed', '接受失败'), 'error')
  }
  finally {
    processingIds.value.delete(invite.id)
  }
}

async function onDecline(invite: UiContactInvite) {
  if (processingIds.value.has(invite.id))
    return
  processingIds.value.add(invite.id)
  try {
    if (invite.type === 'group' && invite.groupId) {
      await declineGroupInvitation(invite.groupId)
    }
    else if (invite.userId) {
      await declineContactInvite(invite.userId)
    }
    showToast(t('contact.inviteDeclined', '已拒绝'), 'success')
    emit('decline', invite)
  }
  catch (err) {
    logger.warn('[ContactNoticeList] decline invite failed:', formatSdkError(err))
    showToast(t('contact.inviteDeclineFailed', '拒绝失败'), 'error')
  }
  finally {
    processingIds.value.delete(invite.id)
  }
}

function statusLabel(status: UiContactInvite['status']): string {
  if (status === 'accepted')
    return t('contact.inviteAccepted', '已接受')
  if (status === 'declined')
    return t('contact.inviteDeclined', '已拒绝')
  return ''
}

function displayTitle(invite: UiContactInvite): string {
  if (invite.type === 'group')
    return invite.groupName || invite.groupId || ''
  return invite.nickname || invite.userId || ''
}

function displaySubtitle(invite: UiContactInvite): string {
  if (invite.type === 'group') {
    const inviter = invite.inviterName || invite.inviterId
    if (inviter)
      return `${t('contact.inviteInviter', '邀请人')}: ${inviter}`
    return invite.groupName || `ID: ${invite.groupId || ''}`
  }
  // 好友申请：有附言展示附言，否则展示设计稿固定文案「向你发送了好友申请」
  return invite.reason || t('contact.inviteRequestReceived', '向你发送了好友申请')
}

function avatarName(invite: UiContactInvite): string {
  if (invite.type === 'group')
    return invite.groupName || invite.groupId || ''
  return invite.nickname || invite.userId || ''
}
</script>

<template>
  <div class="contact-notice-list">
    <!-- Loading -->
    <div v-if="loading && displayInvites.length === 0" class="contact-notice-list__empty">
      <span class="contact-notice-list__empty-text">{{ t('common.loading') }}</span>
    </div>

    <!-- Empty -->
    <Empty
      v-else-if="displayInvites.length === 0"
      icon="person/single"
      :description="t('contact.inviteEmpty', '暂无好友申请')"
    />

    <!-- List -->
    <div v-else class="contact-notice-list__items">
      <div
        v-for="invite in displayInvites"
        :key="invite.id"
        class="contact-notice-list__item"
        :class="{ 'contact-notice-list__item--actionable': !isDeclinedByPeer(invite) }"
      >
        <!-- 对方拒绝通知：粉色失望图标头像（Figma「新-Demo」2772:28346） -->
        <span
          v-if="isDeclinedByPeer(invite)"
          class="contact-notice-list__decline-avatar"
        >
          <Icon name="dspntd" :size="20" />
        </span>
        <Avatar
          v-else
          class="contact-notice-list__avatar"
          :name="avatarName(invite)"
          :src="invite.avatarUrl"
          :size="48"
        />

        <div class="contact-notice-list__info">
          <div class="contact-notice-list__text">
            <span class="contact-notice-list__name">{{ displayTitle(invite) }}</span>
            <span class="contact-notice-list__subtitle">
              {{ isDeclinedByPeer(invite) ? t('contact.inviteDeclinedByPeer', '拒绝了你的好友申请') : displaySubtitle(invite) }}
            </span>
          </div>
          <div
            v-if="effectiveStatus(invite) === 'pending'"
            class="contact-notice-list__actions"
          >
            <button
              class="contact-notice-list__btn contact-notice-list__btn--primary"
              :disabled="isProcessing(invite)"
              @click="onAccept(invite)"
            >
              {{ t('contact.inviteAccept', '接受') }}
            </button>
            <button
              class="contact-notice-list__btn"
              :disabled="isProcessing(invite)"
              @click="onDecline(invite)"
            >
              {{ t('contact.inviteDecline', '拒绝') }}
            </button>
          </div>
          <span
            v-else-if="!isDeclinedByPeer(invite) && statusLabel(effectiveStatus(invite))"
            class="contact-notice-list__status"
          >
            {{ statusLabel(effectiveStatus(invite)) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-notice-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--uikit-bg-base);
}

/* 页面 header（返回 + 标题 + 操作）由 AddressBookContainer 子视图头部提供，模块内不再自绘 */

.contact-notice-list__items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
}

.contact-notice-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-base);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

/* 有待处理操作或状态标签的条目固定 96px；「对方拒绝」纯文案条目 64px */
.contact-notice-list__item--actionable {
  min-height: 96px;
}

@media (hover: hover) {
  .contact-notice-list__item:hover {
    background-color: var(--uikit-bg-hover);
  }
}

.contact-notice-list__avatar,
.contact-notice-list__decline-avatar {
  flex-shrink: 0;
}

.contact-notice-list__decline-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--uikit-danger-color, #ff4d6d) 40%, var(--uikit-bg-base));
  color: var(--uikit-text-inverse);
}

.contact-notice-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.contact-notice-list__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.contact-notice-list__name {
  font-size: var(--uikit-font-size-15);
  font-weight: var(--uikit-font-weight-semibold);
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-notice-list__subtitle {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
  line-height: calc(18px * var(--uikit-font-scale, 1));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-notice-list__actions {
  display: flex;
  gap: 8px;
  align-self: flex-end;
}

.contact-notice-list__btn {
  box-sizing: border-box;
  padding: 4px 16px;
  border-radius: var(--uikit-input-radius, 999px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: transparent;
  color: var(--uikit-text-primary);
  font-size: var(--uikit-font-size-14);
  font-weight: var(--uikit-font-weight-medium);
  line-height: calc(20px * var(--uikit-font-scale, 1));
  cursor: pointer;
  transition:
    opacity var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.contact-notice-list__btn--primary {
  background-color: var(--uikit-primary-color);
  border-color: transparent;
  color: var(--uikit-text-inverse);
}

.contact-notice-list__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (hover: hover) {
  .contact-notice-list__btn:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.contact-notice-list__status {
  align-self: flex-end;
  font-size: var(--uikit-font-size-14);
  font-weight: var(--uikit-font-weight-medium);
  line-height: calc(20px * var(--uikit-font-scale, 1));
  color: var(--uikit-text-tertiary);
}

.contact-notice-list__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 16px;
}

.contact-notice-list__empty-text {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}
</style>
