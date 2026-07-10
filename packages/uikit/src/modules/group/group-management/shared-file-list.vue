<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import Popup from '../../../components/popup/popup.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import { useToast } from '../../../composables/use-toast'
import { useViewport } from '../../../composables/use-viewport'
import ActionSheet from '../../../components/action-sheet/action-sheet.vue'
import type { ActionSheetItem } from '../../../components/action-sheet/action-sheet.vue'

export interface SharedFileListProps {
  groupId: string
}

const props = defineProps<SharedFileListProps>()

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
    { name: t('group.sharedFile.download') || '下载' },
  ]
  if (canDelete(activeFile.value)) {
    actions.push({
      name: t('group.sharedFile.delete') || '删除',
      color: '#ef4444',
    })
  }
  return actions
})

const currentUserId = computed(() => stores.client.currentUser)
const group = computed(() => stores.group.getGroupById(props.groupId))
const isOwnerOrAdmin = computed(() => {
  const role = group.value?.role
  return role === 'owner' || role === 'admin'
})

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchSharedFiles(props.groupId)
    console.warn('[SharedFileList] load result:', result)
    const list = extractSharedFileList(result)
    files.value = list
  }
  catch (err) {
    console.warn('[SharedFileList] load failed:', err)
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
    console.warn('[SharedFileList] upload response:', res)
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
    showToast(t('group.sharedFile.uploadSuccess') || '上传成功')
  }
  catch (err) {
    console.warn('[SharedFileList] upload failed:', err)
    showToast(t('group.sharedFile.uploadFailed') || '上传失败')
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
    showToast(t('group.sharedFile.deleteSuccess') || '删除成功')
  }
  catch (err) {
    console.warn('[SharedFileList] delete failed:', err)
    showToast(t('group.sharedFile.deleteFailed') || '删除失败')
  }
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_FILE_NAME_LENGTH = 24

function formatFileName(fileName: string): string {
  if (fileName.length <= MAX_FILE_NAME_LENGTH)
    return fileName
  const dotIndex = fileName.lastIndexOf('.')
  let name = fileName
  let ext = ''
  if (dotIndex > 0 && dotIndex < fileName.length - 1) {
    ext = fileName.slice(dotIndex)
    name = fileName.slice(0, dotIndex)
  }
  if (name.length + ext.length <= MAX_FILE_NAME_LENGTH)
    return fileName
  const ellipsis = '...'
  const available = MAX_FILE_NAME_LENGTH - ext.length - ellipsis.length
  if (available <= 0)
    return `${fileName.slice(0, MAX_FILE_NAME_LENGTH - ellipsis.length)}${ellipsis}`
  const side = Math.max(1, Math.floor(available / 2))
  return `${name.slice(0, side)}${ellipsis}${name.slice(-side)}${ext}`
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
    showToast(t('group.sharedFile.downloadSuccess') || '下载成功')
  }
  catch (err) {
    console.warn('[SharedFileList] download failed:', err)
    showToast(t('group.sharedFile.downloadFailed') || '下载失败')
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
    <div v-else-if="files.length === 0" class="shared-file-list__empty">
      {{ t('group.sharedFile.empty') || '暂无群文件' }}
    </div>
    <div
      v-for="file in files"
      :key="file.fileId"
      class="shared-file-list__item"
    >
      <Icon name="files-media/file" :size="20" class="shared-file-list__icon" />
      <div class="shared-file-list__info">
        <span class="shared-file-list__name" :title="file.fileName">{{ formatFileName(file.fileName) }}</span>
        <span class="shared-file-list__meta">
          <template v-if="file.fileSize">{{ formatSize(file.fileSize) }}</template>
          <template v-if="file.fileOwner">
            {{ file.fileOwner?.nickname || file.fileOwner?.userId }}
          </template>
        </span>
      </div>
      <button
        class="shared-file-list__more-btn"
        @click.stop="(event) => openActionSheet(file, event as MouseEvent)"
      >
        <Icon name="actions/ellipsis_vertical" :size="20" />
      </button>
    </div>

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
          {{ t('group.sharedFile.download') || '下载' }}
        </div>
        <div
          v-if="activeFile && canDelete(activeFile)"
          class="shared-file-list__context-menu-item is-danger"
          @click.stop="onContextMenuItemClick('delete')"
        >
          {{ t('group.sharedFile.delete') || '删除' }}
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
.shared-file-list__loading,
.shared-file-list__empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
.shared-file-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}
.shared-file-list__icon {
  flex-shrink: 0;
  color: var(--uikit-text-secondary);
}
.shared-file-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shared-file-list__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shared-file-list__meta {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}
.shared-file-list__item:hover .shared-file-list__name {
  color: var(--uikit-primary-color);
}
.shared-file-list__more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: transparent;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition: all var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
  flex-shrink: 0;
}
.shared-file-list__more-btn:hover {
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-primary-color);
}

.shared-file-list__context-menu {
  display: flex;
  flex-direction: column;
  background: var(--uikit-bg-base);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 12px);
  box-shadow: var(--uikit-shadow, 0 10px 32px rgba(0, 0, 0, 0.14));
  min-width: 140px;
  padding: 6px;
}

.shared-file-list__context-menu-item {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--uikit-components-radius, 8px);
  transition: background-color var(--uikit-anim-duration, 150ms) var(--uikit-anim-easing, ease);
}

.shared-file-list__context-menu-item:hover {
  background-color: var(--uikit-bg-hover, #f3f4f6);
}

.shared-file-list__context-menu-item.is-danger {
  color: var(--uikit-danger-color, #ef4444);
}

.shared-file-list__context-menu-item.is-danger:hover {
  background-color: rgba(var(--uikit-danger-rgb, 239, 68, 68), 0.08);
}
</style>
