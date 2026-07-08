<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'
import { useUIKit } from '../../../composables/use-uikit'
import { useToast } from '../../../composables/use-toast'

export interface SharedFileListProps {
  groupId: string
}

const props = defineProps<SharedFileListProps>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { stores } = useUIKit()
const {
  getGroupSharedFileList: fetchSharedFiles,
  uploadGroupSharedFile,
  deleteGroupSharedFile,
} = useGroup()

const loading = ref(false)
const uploading = ref(false)
const files = ref<any[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

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
        <span class="shared-file-list__name">{{ file.fileName }}</span>
        <span class="shared-file-list__meta">
          <template v-if="file.fileSize">{{ formatSize(file.fileSize) }}</template>
          <template v-if="file.fileOwner">
            {{ file.fileOwner?.nickname || file.fileOwner?.userId }}
          </template>
        </span>
      </div>
      <button
        v-if="canDelete(file)"
        class="shared-file-list__delete-btn"
        @click="onDelete(file)"
      >
        {{ t('group.sharedFile.delete') || '删除' }}
      </button>
    </div>
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
.shared-file-list__delete-btn {
  padding: 4px 10px;
  border-radius: var(--uikit-components-radius, 5px);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background-color: var(--uikit-bg-base);
  color: #ef4444;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.shared-file-list__delete-btn:hover {
  background-color: #fef2f2;
  border-color: #fecaca;
}
</style>
