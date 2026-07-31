<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import Popup from '../../../components/popup/popup.vue'
import Avatar from '../../../components/avatar/avatar.vue'
import Cell from '../../../components/cell/cell.vue'
import IconButton from '../../../components/icon-button/icon-button.vue'
import Empty from '../../../components/empty/empty.vue'
import { useLocale } from '../../../locale'
import { useUIKit } from '../../../composables/use-uikit'

export interface GroupReadReceiptModalProps {
  show: boolean
  readList: string[]
  unreadList: string[]
}

const props = defineProps<GroupReadReceiptModalProps>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { t } = useLocale()
const { stores, domains, features } = useUIKit()

/** 当前激活的 Tab：'read' | 'unread' */
const activeTab = ref<'read' | 'unread'>('read')

/** 批量拉取列表中用户的资料（备注/昵称/头像） */
watchEffect(() => {
  if (features.enableUserInfo === false)
    return
  const allIds = [...props.readList, ...props.unreadList]
  const missing = allIds.filter(
    id =>
      id
      && !stores.userInfo.getUserInfo(id)
      && !stores.userInfo.isLoading(id)
      && !stores.userInfo.isFetchFailed(id),
  )
  if (missing.length > 0) {
    void domains.userInfo.fetchUserInfos(missing)
  }
})

/** 获取用户展示名：备注 > 用户资料昵称 > userId */
function getDisplayName(userId: string): string {
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  return contact?.remark || userInfo?.nickname || userId
}

/** 获取用户头像 */
function getAvatarUrl(userId: string): string | undefined {
  return stores.userInfo.getUserInfo(userId)?.avatarUrl
}

const readCount = computed(() => props.readList.length)
const unreadCount = computed(() => props.unreadList.length)

const displayList = computed(() => {
  return activeTab.value === 'read' ? props.readList : props.unreadList
})

function onClose() {
  emit('update:show', false)
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
    <div class="group-read-modal">
      <!-- 标题 -->
      <div class="group-read-modal__header">
        <span class="group-read-modal__title">{{ t('groupReadReceipt.title') }}</span>
        <IconButton
          icon="actions/close"
          size="small"
          variant="ghost"
          :title="t('button.close') || '关闭'"
          @click="onClose"
        />
      </div>

      <!-- Tab 切换 -->
      <div class="group-read-modal__tabs">
        <div
          class="group-read-modal__tab"
          :class="{ 'group-read-modal__tab--active': activeTab === 'read' }"
          @click="activeTab = 'read'"
        >
          <span class="group-read-modal__tab-count">{{ readCount }}</span>
          <span class="group-read-modal__tab-label">{{ t('groupReadReceipt.read') }}</span>
        </div>
        <div
          class="group-read-modal__tab"
          :class="{ 'group-read-modal__tab--active': activeTab === 'unread' }"
          @click="activeTab = 'unread'"
        >
          <span class="group-read-modal__tab-count">{{ unreadCount }}</span>
          <span class="group-read-modal__tab-label">{{ t('groupReadReceipt.unread') }}</span>
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="group-read-modal__list">
        <Cell
          v-for="userId in displayList"
          :key="userId"
          :title="getDisplayName(userId)"
          :clickable="false"
          size="compact"
        >
          <template #leading>
            <Avatar :name="getDisplayName(userId)" :src="getAvatarUrl(userId)" :size="36" />
          </template>
        </Cell>
        <Empty
          v-if="displayList.length === 0"
          icon="empty/members"
          :description="t('groupReadReceipt.empty')"
          size="small"
        />
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.group-read-modal {
  width: 320px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: 12px;
  overflow: hidden;
}

.group-read-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  flex-shrink: 0;
}

.group-read-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
}



/* Tab */
.group-read-modal__tabs {
  display: flex;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.group-read-modal__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 0;
  cursor: pointer;
  font-size: 14px;
  color: var(--uikit-text-secondary);
  transition: color 0.15s;
  position: relative;
}

.group-read-modal__tab:hover {
  color: var(--uikit-text-primary);
}

.group-read-modal__tab--active {
  color: var(--uikit-primary-color);
  font-weight: 500;
}

.group-read-modal__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background-color: var(--uikit-primary-color);
  border-radius: 1px;
}

.group-read-modal__tab-count {
  font-weight: 600;
}

.group-read-modal__tab-label {
  font-size: 13px;
}

/* 列表 */
.group-read-modal__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 120px;
}

</style>
