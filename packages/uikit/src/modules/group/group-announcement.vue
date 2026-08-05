<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import IconButton from '../../components/icon-button/icon-button.vue'
import Modal from '../../components/modal/modal.vue'
import Button from '../../components/button/button.vue'
import { useLocale } from '../../locale'
import { useToast } from '../../composables/use-toast'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import { buildAnnouncementNoticeText, insertChatNotice } from '../../sdk/event/notice-utils'

export interface GroupAnnouncementProps {
  groupId: string
  loading?: boolean
}

export interface GroupAnnouncementEmits {
  (e: 'updated', announcement: string): void
}

const props = defineProps<GroupAnnouncementProps>()
const emit = defineEmits<GroupAnnouncementEmits>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { getGroupAnnouncement, updateGroupAnnouncement, getGroupMembers } = useGroup()

const isEditing = ref(false)
const announcementInputRef = ref<HTMLTextAreaElement>()
const announcementInput = ref('')
const saving = ref(false)
const showHistory = ref(false)

const history = computed(() => stores.group.getGroupAnnouncementHistory(props.groupId))
const latestMeta = computed(() => history.value[0])

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function resolveUserName(userId?: string): string {
  if (!userId)
    return ''
  const contact = stores.contact.getContact(userId)
  const userInfo = stores.userInfo.getUserInfo(userId)
  return contact?.remark || userInfo?.nickname || userId
}

const currentUserId = computed(() => stores.client.currentUser)
const members = computed(() => getGroupMembers(props.groupId))
const currentUserRole = computed(() => {
  if (!currentUserId.value)
    return undefined
  return members.value.find(m => m.userId === currentUserId.value)?.role
})
const isOwner = computed(() => currentUserRole.value === 'owner')
const isAdmin = computed(() => currentUserRole.value === 'admin')
const isAdminOrOwner = computed(() => isOwner.value || isAdmin.value)

const announcement = computed(() => getGroupAnnouncement(props.groupId))

watch(
  () => announcement.value,
  (val) => {
    if (!isEditing.value)
      announcementInput.value = val || ''
  },
  { immediate: true },
)

watch(isEditing, async (editing) => {
  if (editing) {
    await nextTick()
    announcementInputRef.value?.focus()
  }
})

async function save() {
  saving.value = true
  try {
    await updateGroupAnnouncement(props.groupId, announcementInput.value)
    isEditing.value = false
    emit('updated', announcementInput.value)
    // 记录公告历史（发布方有当前用户 ID）
    stores.group.addGroupAnnouncementHistory(props.groupId, {
      content: announcementInput.value,
      updater: stores.client.currentUser || undefined,
      updateTime: Date.now(),
    })
    // 发布方本地插入灰色通知：SDK 的 onAnnouncementChanged 事件不回推操作者本人，
    // 需自行插入，与接收方文案保持一致（带最新公告内容）
    insertChatNotice(stores, props.groupId, 'groupChat', buildAnnouncementNoticeText(announcementInput.value))
    showToast(t('chat.info.groupInfoUpdated') || '更新成功', 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed') || '更新失败', 'error')
  }
  finally {
    saving.value = false
  }
}

function cancel() {
  isEditing.value = false
  announcementInput.value = announcement.value || ''
}
</script>

<template>
  <div class="group-announcement">
    <div class="group-announcement__label-row">
      <span class="group-announcement__label">{{ t('chat.info.groupAnnouncement') }}</span>
      <IconButton
        v-if="isAdminOrOwner && !isEditing"
        icon="actions/edit"
        size="small"
        type="primary"
        :title="t('chat.info.edit') || '编辑'"
        @click="isEditing = true"
      />
    </div>
    <div class="group-announcement__section">
      <template v-if="!isEditing">
        <div class="group-announcement__content">
          <span v-if="loading" class="group-announcement__placeholder">{{ t('common.loading') }}</span>
          <span v-else-if="announcement">{{ announcement }}</span>
          <span v-else class="group-announcement__placeholder">{{ t('chat.info.groupAnnouncementPlaceholder') }}</span>
        </div>
        <div v-if="latestMeta?.updateTime" class="group-announcement__meta">
          <span>{{ t('chat.info.groupAnnouncementUpdatedAt') || '更新于' }} {{ formatTime(latestMeta.updateTime) }}</span>
          <span v-if="latestMeta.updater">{{ t('chat.info.groupAnnouncementUpdatedBy') || '发布者' }} {{ resolveUserName(latestMeta.updater) }}</span>
        </div>
        <div class="group-announcement__actions">
          <Button type="default" size="small" @click="showHistory = true">
            {{ t('chat.info.groupAnnouncementHistory') || '查看历史公告' }}
          </Button>
        </div>
      </template>
      <div v-else class="group-announcement__edit">
        <textarea
          ref="announcementInputRef"
          v-model="announcementInput"
          class="group-announcement__textarea"
          :placeholder="t('chat.info.groupAnnouncementPlaceholder')"
          rows="3"
        />
        <div class="group-announcement__edit-actions">
          <IconButton
            icon="actions/xmark_thick"
            size="small"
            type="danger"
            :title="t('button.cancel') || '取消'"
            @click="cancel"
          />
          <IconButton
            class="group-announcement__save"
            icon="actions/check"
            size="small"
            type="success"
            :disabled="saving"
            :title="t('chat.info.save') || '保存'"
            @click="save"
          />
        </div>
      </div>
    </div>

    <!-- 历史公告弹窗 -->
    <Modal
      v-model:show="showHistory"
      :title="t('chat.info.groupAnnouncementHistory') || '历史公告'"
      :confirm-text="t('button.close') || '关闭'"
      :show-cancel="false"
      @confirm="showHistory = false"
    >
      <div class="group-announcement__history">
        <div v-if="history.length === 0" class="group-announcement__history-empty">
          {{ t('chat.info.groupAnnouncementHistoryEmpty') || '暂无历史公告' }}
        </div>
        <div
          v-for="(record, index) in history"
          :key="`${record.updateTime}-${index}`"
          class="group-announcement__history-item"
        >
          <div class="group-announcement__history-meta">
            <span class="group-announcement__history-time">{{ formatTime(record.updateTime) }}</span>
            <span v-if="record.updater" class="group-announcement__history-updater">{{ resolveUserName(record.updater) }}</span>
          </div>
          <div class="group-announcement__history-content">{{ record.content || t('chat.info.groupAnnouncementCleared') || '公告已清空' }}</div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.group-announcement {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-announcement__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-announcement__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.group-announcement__section {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary);
}

.group-announcement__content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--uikit-text-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

.group-announcement__placeholder {
  color: var(--uikit-text-secondary);
}

.group-announcement__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.group-announcement__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.group-announcement__edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-announcement__textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--uikit-border-color);
  border-radius: 6px;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.group-announcement__textarea:focus {
  border-color: var(--uikit-primary-color);
}

.group-announcement__edit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.group-announcement__history {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;
}

.group-announcement__history-empty {
  text-align: center;
  font-size: 14px;
  color: var(--uikit-text-secondary);
  padding: 24px 0;
}

.group-announcement__history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
}

.group-announcement__history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.group-announcement__history-time {
  font-weight: 500;
}

.group-announcement__history-updater {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-announcement__history-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--uikit-text-primary);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
