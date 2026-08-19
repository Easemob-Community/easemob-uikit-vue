<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmIconButton as IconButton } from '@easemob/uikit-core'
import { useLocale } from '@easemob/uikit-core'
import { useToast } from '@easemob/uikit-core'
import { useUIKit } from '../../composables/use-uikit'
import { CONVERSATION_TYPE, GROUP_INFO_LIMIT, GROUP_MEMBER_ROLE, NOTICE_EVENT_TYPE } from '@easemob/uikit-core'
import { useGroup } from '../../composables/use-group'
import { buildAnnouncementNoticeText, insertChatNotice } from '@easemob/uikit-core'

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

function formatCharCount(current: number, max: number): string {
  return t('common.charCount', '{current}/{max}').replace('{current}', String(current)).replace('{max}', String(max))
}

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
const isOwner = computed(() => currentUserRole.value === GROUP_MEMBER_ROLE.OWNER)
const isAdmin = computed(() => currentUserRole.value === GROUP_MEMBER_ROLE.ADMIN)
const isAdminOrOwner = computed(() => isOwner.value || isAdmin.value)

const announcement = computed(() => getGroupAnnouncement(props.groupId))

// 默认单行省略；仅当内容确实超出一行时才提供展开/收起交互
const collapsed = ref(true)
const canExpand = ref(false)
const contentRef = ref<HTMLDivElement>()

function measureOverflow() {
  const el = contentRef.value
  // 仅在折叠态测量：展开态 scrollHeight 等于 clientHeight，无法判断是否超一行
  if (!el || !collapsed.value)
    return
  canExpand.value = el.scrollHeight > el.clientHeight + 1
}

watch(
  [() => announcement.value, () => props.loading],
  () => {
    // 内容更新后回到默认单行省略，并重新判断是否需要折叠交互
    collapsed.value = true
    nextTick(measureOverflow)
  },
  { immediate: true },
)

watch(collapsed, (val) => {
  if (val)
    nextTick(measureOverflow)
})

onMounted(measureOverflow)
useResizeObserver(contentRef, measureOverflow)

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
  if (announcementInput.value.length > GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH) {
    showToast(t('chat.info.groupAnnouncementTooLong').replace('{max}', String(GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH)), 'error')
    return
  }
  saving.value = true
  try {
    await updateGroupAnnouncement(props.groupId, announcementInput.value)
    isEditing.value = false
    emit('updated', announcementInput.value)
    // 发布方本地插入灰色通知：SDK 的 onAnnouncementChanged 事件不回推操作者本人，
    // 需自行插入，与接收方文案保持一致（带最新公告内容）
    insertChatNotice(stores, props.groupId, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.ANNOUNCEMENT_CHANGED,
      params: { announcement: announcementInput.value },
      defaultText: buildAnnouncementNoticeText(announcementInput.value),
    })
    showToast(t('chat.info.groupInfoUpdated', '更新成功'), 'success')
  }
  catch (err) {
    showToast(err instanceof Error ? err.message : String(err) || t('chat.info.groupInfoUpdateFailed', '更新失败'), 'error')
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
      <div class="group-announcement__label">
        <Icon name="board" :size="16" />
        <span>{{ t('chat.info.groupAnnouncement') }}</span>
      </div>
      <IconButton
        v-if="isAdminOrOwner && !isEditing"
        icon="rect/pencil"
        size="small"
        type="primary"
        :title="t('chat.info.edit', '编辑')"
        @click="isEditing = true"
      />
    </div>
    <div class="group-announcement__section">
      <template v-if="!isEditing">
        <div
          ref="contentRef"
          class="group-announcement__content"
          :class="{ 'is-collapsed': collapsed }"
        >
          <span v-if="loading" class="group-announcement__placeholder">{{ t('common.loading') }}</span>
          <span v-else-if="announcement">{{ announcement }}</span>
          <span v-else class="group-announcement__placeholder">{{ t('chat.info.groupAnnouncementPlaceholder') }}</span>
        </div>
        <button
          v-if="canExpand && announcement"
          class="group-announcement__toggle"
          :title="collapsed ? (t('chat.announcementBanner.expand', '展开')) : (t('chat.announcementBanner.collapse', '收起'))"
          @click="collapsed = !collapsed"
        >
          <Icon :name="collapsed ? 'chevron/down' : 'chevron/up'" :size="14" />
        </button>
      </template>
      <div v-else class="group-announcement__edit">
        <textarea
          ref="announcementInputRef"
          v-model="announcementInput"
          class="group-announcement__textarea"
          :placeholder="t('chat.info.groupAnnouncementPlaceholder')"
          rows="3"
          :maxlength="GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH"
        />
        <div
          class="group-announcement__char-count"
          :class="{ 'is-near-limit': announcementInput.length > GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH * 0.9 }"
        >
          {{ formatCharCount(announcementInput.length, GROUP_INFO_LIMIT.ANNOUNCEMENT_MAX_LENGTH) }}
        </div>
        <div class="group-announcement__edit-actions">
          <IconButton
            icon="xmark/bold"
            size="small"
            type="danger"
            :title="t('button.cancel', '取消')"
            @click="cancel"
          />
          <IconButton
            class="group-announcement__save"
            icon="check/single"
            size="small"
            type="success"
            :disabled="saving"
            :title="t('chat.info.save', '保存')"
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--uikit-font-size-14);
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.group-announcement__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--uikit-bg-secondary);
}

.group-announcement__content {
  font-size: var(--uikit-font-size-13);
  line-height: 1.5;
  color: var(--uikit-text-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

.group-announcement__content.is-collapsed {
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.group-announcement__toggle {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  border-radius: var(--uikit-components-radius, 6px);
  transition: background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
  .group-announcement__toggle:hover {
    background-color: var(--uikit-bg-hover);
  }
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
  font-size: var(--uikit-font-size-13);
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

.group-announcement__char-count {
  align-self: flex-end;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-tertiary);
  line-height: 1;
}

.group-announcement__char-count.is-near-limit {
  color: var(--uikit-warning-color, var(--uikit-error-color, #f59e0b));
}
</style>
