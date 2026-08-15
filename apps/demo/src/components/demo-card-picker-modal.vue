<script setup lang="ts">
import { computed } from 'vue'
import { EmAvatar, EmIcon, EmPopup, useLocale, useUIKit } from '@easemob/uikit-im'
import type { UiContact } from '@easemob/uikit-im'

export interface DemoCardPickerModalProps {
  show: boolean
  ownUserId?: string
  contacts?: UiContact[]
}

export interface DemoCardPickerModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'select', userId: string): void
}

const props = defineProps<DemoCardPickerModalProps>()
const emit = defineEmits<DemoCardPickerModalEmits>()

const { t } = useLocale()
const { stores } = useUIKit()

/** 我的名片展示信息 */
const ownInfo = computed(() => {
  if (!props.ownUserId)
    return null
  const contact = stores.contact.getContact(props.ownUserId)
  const userInfo = stores.userInfo.getUserInfo(props.ownUserId)
  return {
    userId: props.ownUserId,
    name: contact?.remark || userInfo?.nickname || props.ownUserId,
    avatar: userInfo?.avatarUrl || contact?.avatar,
  }
})

/** 好友列表（过滤掉自己，并按名称排序） */
const friendList = computed(() => {
  const list = props.contacts || []
  return list
    .filter(c => c.userId !== props.ownUserId)
    .map((c) => {
      const userInfo = stores.userInfo.getUserInfo(c.userId)
      return {
        ...c,
        name: c.remark || c.name || userInfo?.nickname || c.userId,
        avatar: c.avatar || userInfo?.avatarUrl,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
})

function onSelect(userId: string) {
  emit('select', userId)
  emit('update:show', false)
}

function onClose() {
  emit('update:show', false)
}
</script>

<template>
  <EmPopup
    :show="props.show"
    position="center"
    :close-on-click-overlay="true"
    :show-close="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onClose"
  >
    <div class="demo-card-picker">
      <div class="demo-card-picker__header">
        <span class="demo-card-picker__title">{{ t('demo.card.send') }}</span>
      </div>

      <!-- 我的名片 -->
      <div
        v-if="ownInfo"
        class="demo-card-picker__section"
        @click="onSelect(ownInfo.userId)"
      >
        <div class="demo-card-picker__section-title">
          {{ t('demo.card.myCard') }}
        </div>
        <div class="demo-card-picker__item">
          <EmAvatar :src="ownInfo.avatar" :name="ownInfo.name" :size="36" />
          <span class="demo-card-picker__name">{{ ownInfo.name }}</span>
          <EmIcon name="arrow/arrow_right" :size="16" class="demo-card-picker__arrow" />
        </div>
      </div>

      <!-- 联系人名片 -->
      <div v-if="friendList.length > 0" class="demo-card-picker__section">
        <div class="demo-card-picker__section-title">
          {{ t('demo.card.contactCard') }}
        </div>
        <div class="demo-card-picker__list">
          <div
            v-for="contact in friendList"
            :key="contact.userId"
            class="demo-card-picker__item"
            @click="onSelect(contact.userId)"
          >
            <EmAvatar :src="contact.avatar" :name="contact.name" :size="36" />
            <span class="demo-card-picker__name">{{ contact.name }}</span>
            <EmIcon name="arrow/arrow_right" :size="16" class="demo-card-picker__arrow" />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!ownInfo && friendList.length === 0" class="demo-card-picker__empty">
        {{ t('demo.card.noAvailable') }}
      </div>
    </div>
  </EmPopup>
</template>

<style scoped>
.demo-card-picker {
  width: 320px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: var(--uikit-components-radius, 12px);
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
}

.demo-card-picker__header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.demo-card-picker__title {
  font-size: 16px;
  font-weight: 600;
}

.demo-card-picker__section {
  margin-bottom: 12px;
}

.demo-card-picker__section-title {
  padding: 8px 4px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.demo-card-picker__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--uikit-components-radius, 8px);
  cursor: pointer;
  transition: background-color 0.15s;
}

.demo-card-picker__item:hover {
  background-color: var(--uikit-bg-hover);
}

.demo-card-picker__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-card-picker__arrow {
  color: var(--uikit-text-tertiary);
  flex-shrink: 0;
}

.demo-card-picker__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
}

.demo-card-picker__empty {
  padding: 24px 8px;
  text-align: center;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
</style>
