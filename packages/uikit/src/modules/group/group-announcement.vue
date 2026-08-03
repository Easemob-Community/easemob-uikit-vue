<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import IconButton from '../../components/icon-button/icon-button.vue'
import { useLocale } from '../../locale'
import { useToast } from '../../composables/use-toast'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'

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
</style>
