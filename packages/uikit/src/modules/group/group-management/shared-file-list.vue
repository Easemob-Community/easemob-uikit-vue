<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatSdkError } from '../../../utils/sdk-error'
import Popup from '../../../components/popup/popup.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import { useToast } from '../../../composables/use-toast'
import { useViewport } from '../../../composables/use-viewport'
import { insertChatNotice } from '../../../sdk/event/notice-utils'
import { CONVERSATION_TYPE, GROUP_MEMBER_ROLE, NOTICE_EVENT_TYPE } from '../../../constants'
import ActionSheet from '../../../components/action-sheet/action-sheet.vue'
import type { ActionSheetItem } from '../../../components/action-sheet/action-sheet.vue'
import Empty from '../../../components/empty/empty.vue'
import { createLogger } from '../../../utils/logger'
import SharedFileListItem from './shared-file-list-item.vue'

const props = defineProps<SharedFileListProps>()

const logger = createLogger('UIKit:SharedFileList')

export interface SharedFileListProps {
  groupId: string
}

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const { isMobile } = useViewport()
const {
  getGroupSharedFileList: fetchSharedFiles,
  uploadGroupSharedFile,
  deleteGroupSharedFile,
  downloadGroupSharedFile,
} = useGroup()

const loading = ref(false)
const uploading = ref(false)
const files = ref<any[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const showActionSheet = ref(false)
const showContextMenu = ref(false)
const contextMenuAnchor = ref<HTMLElement>()
const activeFile = ref<any>(null)

const actionSheetActions = computed<ActionSheetItem[]>(() => {
  if (!activeFile.value)
    return []
  const actions: ActionSheetItem[] = [
    { name: t('group.sharedFile.download', '下载') },
  ]
  if (canDelete(activeFile.value)) {
    actions.push({
      name: t('group.sharedFile.delete', '删除'),
      color: '#ef4444',
    })
  }
  return actions
})

const currentUserId = computed(() => stores.client.currentUser)
const group = computed(() => stores.group.getGroupById(props.groupId))
const isOwnerOrAdmin = computed(() => {
  const role = group.value?.role
  return role === GROUP_MEMBER_ROLE.OWNER || role === GROUP_MEMBER_ROLE.ADMIN
})

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchSharedFiles(props.groupId)
    logger.warn('[SharedFileList] load result:', result)
    const list = extractSharedFileList(result)
    files.value = list
  }
  catch (err) {
    logger.warn('[SharedFileList] load failed:', formatSdkError(err))
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })
onMounted(loadData)

function extractSharedFileList(result: any): any[] {
  if (Array.isArray(result))
    return [...result]
  if (!result || typeof result !== 'object')
    return []
  if (Array.isArray(result.items))
    return [...result.items]
  if (Array.isArray(result.data))
    return [...result.data]
  if (result.data && Array.isArray(result.data.items))
    return [...result.data.items]
  if (Array.isArray(result.entities))
    return [...result.entities]
  return []
}

function onUploadClick() {
  fileInputRef.value?.click()
}

defineExpose({
  triggerUpload: onUploadClick,
})

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !props.groupId)
    return
  if (uploading.value)
    return

  uploading.value = true
  try {
    const res = await uploadGroupSharedFile(props.groupId, file)
    logger.warn('[SharedFileList] upload response:', res)
    const uploadedFiles = parseUploadResponse(res)
    if (uploadedFiles.length > 0) {
      if (isListResponse(res)) {
        files.value = uploadedFiles
      }
      else {
        const existingIds = new Set(files.value.map(f => f.fileId).filter(Boolean))
        const newFiles = uploadedFiles.filter(f => f.fileId && !existingIds.has(f.fileId))
        if (newFiles.length > 0)
          files.value = [...newFiles, ...files.value]
      }
    }
    showToast(t('group.sharedFile.uploadSuccess', '上传成功'), 'success')
    // 发布方本地插入灰色通知：SDK 的 onSharedFileAdded 事件不回推操作者本人，
    // 与接收方文案保持一致（带上传者与文件名）
    const noticeText = t('chat.notice.sharedFileAdded')
      .replace('{name}', t('chat.notice.you'))
      .replace('{fileName}', file.name)
    insertChatNotice(stores, props.groupId, CONVERSATION_TYPE.GROUPCHAT, {
      eventType: NOTICE_EVENT_TYPE.SHARED_FILE_ADDED,
      params: { name: t('chat.notice.you'), fileName: file.name },
      defaultText: noticeText,
    })
  }
  catch (err) {
    logger.warn('[SharedFileList] upload failed:', formatSdkError(err))
    showToast(t('group.sharedFile.uploadFailed', '上传失败'), 'error')
  }
  finally {
    uploading.value = false
    if (fileInputRef.value)
      fileInputRef.value.value = ''
  }
}

function isListResponse(res: unknown): boolean {
  if (Array.isArray(res))
    return true
  let payload = res
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    }
    catch {
      return false
    }
  }
  if (!payload || typeof payload !== 'object')
    return false
  return Array.isArray((payload as any).items) || Array.isArray((payload as any).data)
}

function parseUploadResponse(res: unknown): any[] {
  let payload = res
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    }
    catch {
      return []
    }
  }
  if (!payload || typeof payload !== 'object')
    return []

  const data = (payload as any).data ?? payload
  if (Array.isArray(data))
    return data.map(normalizeSharedFile).filter(Boolean)
  if (Array.isArray((payload as any).items))
    return (payload as any).items.map(normalizeSharedFile).filter(Boolean)
  const single = normalizeSharedFile(data)
  return single ? [single] : []
}

function normalizeSharedFile(raw: any): any {
  if (!raw || typeof raw !== 'object')
    return null
  const fileId = raw.fileId ?? raw.file_id ?? raw.id
  const fileName = raw.fileName ?? raw.file_name ?? raw.name
  if (!fileId || !fileName)
    return null
  return {
    fileId,
    fileName,
    fileSize: raw.fileSize ?? raw.file_size ?? raw.size,
    createdAt: raw.createdAt ?? raw.created ?? raw.created_at ?? raw.timestamp,
    fileOwner: normalizeFileOwner(raw.fileOwner ?? raw.file_owner ?? raw.owner),
  }
}

function normalizeFileOwner(raw: any): any {
  if (!raw)
    return undefined
  if (typeof raw === 'string')
    return { userId: raw }
  return {
    userId: raw.userId ?? raw.user_id ?? raw.username ?? raw.id,
    nickname: raw.nickname ?? raw.nickName ?? raw.nick,
  }
}

function canDelete(file: any): boolean {
  if (!currentUserId.value)
    return false
  if (isOwnerOrAdmin.value)
    return true
  return file.fileOwner?.userId === currentUserId.value
}

async function onDelete(file: any) {
  if (!props.groupId || !file.fileId)
    return
  try {
    await deleteGroupSharedFile(props.groupId, file.fileId)
    files.value = files.value.filter(f => f.fileId !== file.fileId)
    showToast(t('group.sharedFile.deleteSuccess', '删除成功'), 'success')
  }
  catch (err) {
    logger.warn('[SharedFileList] delete failed:', formatSdkError(err))
    showToast(t('group.sharedFile.deleteFailed', '删除失败'), 'error')
  }
}

function openActionSheet(file: any, event?: MouseEvent) {
  activeFile.value = file
  if (isMobile.value) {
    showActionSheet.value = true
  }
  else {
    contextMenuAnchor.value = event?.currentTarget as HTMLElement
    showContextMenu.value = true
  }
}

function onContextMenuClose() {
  showContextMenu.value = false
  contextMenuAnchor.value = undefined
}

function onContextMenuItemClick(actionKey: 'download' | 'delete') {
  onContextMenuClose()
  const file = activeFile.value
  if (!file)
    return
  if (actionKey === 'download')
    onDownload(file)
  else if (actionKey === 'delete')
    onDelete(file)
}

async function onActionSheetSelect(_item: ActionSheetItem, index: number) {
  const file = activeFile.value
  if (!file)
    return
  if (index === 0)
    await onDownload(file)
  else
    await onDelete(file)
}

async function onDownload(file: any) {
  if (!props.groupId || !file.fileId)
    return
  try {
    const blob = await downloadGroupSharedFile(props.groupId, file.fileId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.fileName || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(t('group.sharedFile.downloadSuccess', '下载成功'), 'success')
  }
  catch (err) {
    logger.warn('[SharedFileList] download failed:', formatSdkError(err))
    showToast(t('group.sharedFile.downloadFailed', '下载失败'), 'error')
  }
}
</script>

<template>
  <div class="shared-file-list">
    <input
      ref="fileInputRef"
      type="file"
      class="shared-file-list__file-input"
      @change="onFileSelected"
    >

    <div v-if="loading" class="shared-file-list__loading">
      {{ t('common.loading') }}
    </div>
    <Empty
      v-else-if="files.length === 0"
      icon="empty/files"
      :description="t('group.sharedFile.empty', '暂无群文件')"
      size="small"
    />
    <SharedFileListItem
      v-for="file in files"
      :key="file.fileId"
      :file="file"
      @more="(file, event) => openActionSheet(file, event as MouseEvent)"
    />

    <ActionSheet
      v-model:show="showActionSheet"
      :actions="actionSheetActions"
      @select="onActionSheetSelect"
    />

    <!-- PC 端使用 Popup 锚定菜单 -->
    <Popup
      :show="showContextMenu"
      :anchor="contextMenuAnchor"
      placement="bottom"
      :overlay="false"
      :close-on-click-overlay="true"
      group="shared-file-context-menu"
      @update:show="onContextMenuClose"
      @close="onContextMenuClose"
    >
      <div class="shared-file-list__context-menu">
        <div
          class="shared-file-list__context-menu-item"
          @click.stop="onContextMenuItemClick('download')"
        >
          {{ t('group.sharedFile.download', '下载') }}
        </div>
        <div
          v-if="activeFile && canDelete(activeFile)"
          class="shared-file-list__context-menu-item is-danger"
          @click.stop="onContextMenuItemClick('delete')"
        >
          {{ t('group.sharedFile.delete', '删除') }}
        </div>
      </div>
    </Popup>
  </div>
</template>

<style scoped>
.shared-file-list {
  padding: 8px 0;
}
.shared-file-list__file-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.shared-file-list__loading {
  text-align: center;
  padding: 16px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}

.shared-file-list__context-menu {
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 6px;
}

.shared-file-list__context-menu-item {
  padding: 10px 12px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

@media (hover: hover) {
  .shared-file-list__context-menu-item:hover {
    background-color: var(--uikit-bg-hover, #f3f4f6);
  }
}

.shared-file-list__context-menu-item.is-danger {
  color: var(--uikit-danger-color, #ef4444);
}

@media (hover: hover) {
  .shared-file-list__context-menu-item.is-danger:hover {
    background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
  }
}
</style>
