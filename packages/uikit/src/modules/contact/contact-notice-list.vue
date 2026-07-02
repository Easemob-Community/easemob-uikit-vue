<script setup lang="ts">
import { computed, ref } from 'vue'
import Avatar from '../../components/avatar/avatar.vue'
import Icon from '../../components/icon/icon.vue'
import { useLocale } from '../../locale'
import { useToast } from '../../composables/use-toast'
import { useContact } from '../../composables/use-contact'
import type { UiContactInvite } from '../../sdk/types'

export interface ContactNoticeListProps {
  invites?: UiContactInvite[]
  loading?: boolean
}

const props = withDefaults(defineProps<ContactNoticeListProps>(), {
  invites: undefined,
  loading: false,
})

const emit = defineEmits<{
  (e: 'accept', userId: string): void
  (e: 'decline', userId: string): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { inviteList, acceptContactInvite, declineContactInvite } = useContact()

const displayInvites = computed(() => props.invites ?? inviteList.value)

const processingIds = ref<Set<string>>(new Set())

function isProcessing(userId: string): boolean {
  return processingIds.value.has(userId)
}

async function onAccept(invite: UiContactInvite) {
  if (processingIds.value.has(invite.userId))
    return
  processingIds.value.add(invite.userId)
  try {
    await acceptContactInvite(invite.userId)
    emit('accept', invite.userId)
  }
  catch (err) {
    console.warn('[ContactNoticeList] accept invite failed:', err)
    showToast(t('contact.inviteAcceptFailed') || '接受好友申请失败')
  }
  finally {
    processingIds.value.delete(invite.userId)
  }
}

async function onDecline(invite: UiContactInvite) {
  if (processingIds.value.has(invite.userId))
    return
  processingIds.value.add(invite.userId)
  try {
    await declineContactInvite(invite.userId)
    emit('decline', invite.userId)
  }
  catch (err) {
    console.warn('[ContactNoticeList] decline invite failed:', err)
    showToast(t('contact.inviteDeclineFailed') || '拒绝好友申请失败')
  }
  finally {
    processingIds.value.delete(invite.userId)
  }
}

function formatTime(timestamp?: number): string {
  if (!timestamp)
    return ''
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function statusLabel(status: UiContactInvite['status']): string {
  if (status === 'accepted')
    return t('contact.inviteAccepted') || '已接受'
  if (status === 'declined')
    return t('contact.inviteDeclined') || '已拒绝'
  return ''
}

function displayName(invite: UiContactInvite): string {
  return invite.nickname || invite.userId
}
</script>

<template>
  <div class="contact-notice-list">
    <!-- Header -->
    <div class="contact-notice-list__header">
      <span class="contact-notice-list__title">{{ t('contact.inviteTitle') || '好友申请' }}</span>
      <span v-if="displayInvites.length > 0" class="contact-notice-list__count">{{ displayInvites.length }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading && displayInvites.length === 0" class="contact-notice-list__empty">
      <span class="contact-notice-list__empty-text">{{ t('common.loading') }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="displayInvites.length === 0" class="contact-notice-list__empty">
      <Icon name="misc/bell" :size="40" class="contact-notice-list__empty-icon" />
      <span class="contact-notice-list__empty-text">{{ t('contact.inviteEmpty') || '暂无好友申请' }}</span>
    </div>

    <!-- List -->
    <div v-else class="contact-notice-list__items">
      <div
        v-for="invite in displayInvites"
        :key="invite.userId"
        class="contact-notice-list__item"
        :class="{
          'contact-notice-list__item--accepted': invite.status === 'accepted',
          'contact-notice-list__item--declined': invite.status === 'declined',
        }"
      >
        <Avatar
          class="contact-notice-list__avatar"
          :name="displayName(invite)"
          :src="invite.avatarUrl"
          :size="44"
        />

        <div class="contact-notice-list__info">
          <div class="contact-notice-list__name-row">
            <span class="contact-notice-list__name">{{ displayName(invite) }}</span>
            <span v-if="statusLabel(invite.status)" class="contact-notice-list__status">{{ statusLabel(invite.status) }}</span>
          </div>
          <div class="contact-notice-list__meta">
            <span class="contact-notice-list__id">ID: {{ invite.userId }}</span>
            <span v-if="invite.reason" class="contact-notice-list__reason">{{ t('contact.inviteReason') || '附言' }}: {{ invite.reason }}</span>
          </div>
          <div v-if="invite.timestamp" class="contact-notice-list__time">
            {{ formatTime(invite.timestamp) }}
          </div>
        </div>

        <div class="contact-notice-list__actions">
          <template v-if="invite.status === 'pending'">
            <button
              class="contact-notice-list__btn contact-notice-list__btn--primary"
              :disabled="isProcessing(invite.userId)"
              @click="onAccept(invite)"
            >
              {{ t('contact.inviteAccept') || '接受' }}
            </button>
            <button
              class="contact-notice-list__btn contact-notice-list__btn--default"
              :disabled="isProcessing(invite.userId)"
              @click="onDecline(invite)"
            >
              {{ t('contact.inviteDecline') || '拒绝' }}
            </button>
          </template>
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

.contact-notice-list__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.contact-notice-list__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}

.contact-notice-list__count {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  background-color: #ef4444;
  padding: 1px 7px;
  border-radius: 10px;
}

.contact-notice-list__items {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.contact-notice-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  transition: background-color 0.15s;
}

.contact-notice-list__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.contact-notice-list__item--accepted,
.contact-notice-list__item--declined {
  opacity: 0.7;
}

.contact-notice-list__avatar {
  flex-shrink: 0;
}

.contact-notice-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-notice-list__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contact-notice-list__name {
  font-size: 15px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.contact-notice-list__status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-secondary);
}

.contact-notice-list__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-notice-list__id,
.contact-notice-list__reason,
.contact-notice-list__time {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-notice-list__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.contact-notice-list__btn {
  padding: 6px 14px;
  border-radius: var(--uikit-components-radius, 6px);
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.contact-notice-list__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.contact-notice-list__btn--primary {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.contact-notice-list__btn--default {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
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

.contact-notice-list__empty-icon {
  color: var(--uikit-text-secondary);
  opacity: 0.5;
}

.contact-notice-list__empty-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
</style>
