<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '../../../components/icon/icon.vue'
import { useLocale } from '../../../locale'
import { useGroup } from '../../../composables/use-group'

export interface SharedFileListProps {
  groupId: string
}

const props = defineProps<SharedFileListProps>()

const { t } = useLocale()
const { getGroupSharedFileList: fetchSharedFiles } = useGroup()

const loading = ref(false)
const files = ref<any[]>([])

async function loadData() {
  if (!props.groupId)
    return
  loading.value = true
  try {
    const result = await fetchSharedFiles(props.groupId) as any
    files.value = Array.isArray(result)
      ? [...result]
      : (result?.items ? [...result.items] : [])
  }
  catch (err) {
    console.warn('[SharedFileList] load failed:', err)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.groupId, loadData, { immediate: true })

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
    <div v-if="loading" class="shared-file-list__loading">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="files.length === 0" class="shared-file-list__empty">
      {{ t('group.memberList.empty') || '暂无共享文件' }}
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
      <!-- 下载/删除按钮留空：下载需业务方自行实现 -->
    </div>
  </div>
</template>

<style scoped>
.shared-file-list {
  padding: 8px 0;
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
</style>
