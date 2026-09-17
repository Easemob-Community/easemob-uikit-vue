<script setup lang="ts">
import { computed } from 'vue'
import { EmIcon as Icon } from '@easemob/uikit-core'
import { EmCell as Cell } from '@easemob/uikit-core'
import { useUserInfo } from '../../../composables/use-user-info'

export interface SharedFileListItemProps {
  file: any
  maxFileNameLength?: number
  /**
   * 分隔线（透传 EmCell 的 border 能力）：true/'bottom' = 底部发丝线，'top' = 顶部分隔线，false/缺省 = 无。
   * 默认无（不影响群管理 section 等其他消费方）；会话详情抽屉群文件页传 'bottom'。
   */
  border?: boolean | 'top' | 'bottom'
}

const props = defineProps<SharedFileListItemProps>()

const emit = defineEmits<{
  (e: 'more', file: any, event: MouseEvent): void
}>()

const ownerUserId = computed(() => props.file.fileOwner?.userId || '')

const { displayName: ownerDisplayName } = useUserInfo(ownerUserId)

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileName(fileName: string): string {
  const maxLength = props.maxFileNameLength ?? 24
  if (fileName.length <= maxLength)
    return fileName
  const dotIndex = fileName.lastIndexOf('.')
  let name = fileName
  let ext = ''
  if (dotIndex > 0 && dotIndex < fileName.length - 1) {
    ext = fileName.slice(dotIndex)
    name = fileName.slice(0, dotIndex)
  }
  if (name.length + ext.length <= maxLength)
    return fileName
  const ellipsis = '...'
  const available = maxLength - ext.length - ellipsis.length
  if (available <= 0)
    return `${fileName.slice(0, maxLength - ellipsis.length)}${ellipsis}`
  const side = Math.max(1, Math.floor(available / 2))
  return `${name.slice(0, side)}${ellipsis}${name.slice(-side)}${ext}`
}

function onMoreClick(event: MouseEvent) {
  emit('more', props.file, event)
}
</script>

<template>
  <!-- EmCell 行（与群成员行同体系）：auto-height + 可选 border 发丝线；
       clickable=false 保证 hover 无行背景块（仅 ⋮ 按钮自身 hover 出背景） -->
  <Cell
    class="shared-file-list__item"
    auto-height
    :clickable="false"
    :border="props.border"
    @click="onMoreClick"
  >
    <template #leading>
      <!-- 文件图标：与群管理入口列表「共享文件」行同款 doc 中性灰图标 -->
      <Icon name="doc" :size="18" class="shared-file-list__icon" />
    </template>

    <div class="shared-file-list__info">
      <span class="shared-file-list__name" :title="props.file.fileName">{{ formatFileName(props.file.fileName) }}</span>
      <span class="shared-file-list__meta">
        <template v-if="props.file.fileSize">{{ formatSize(props.file.fileSize) }}</template>
        <template v-if="props.file.fileOwner">
          {{ ownerDisplayName || props.file.fileOwner?.userId }}
        </template>
      </span>
    </div>

    <template #trailing>
      <button
        class="shared-file-list__more-btn"
        @click.stop="onMoreClick"
      >
        <Icon name="vertical" :size="20" />
      </button>
    </template>
  </Cell>
</template>

<style scoped>
/* 行垂直内边距与改造前一致（8px）；横向内收在 border 模式下由 --uikit-cell-border-padding-x 控制 */
.shared-file-list__item {
  --uikit-cell-padding-y: 8px;
}

.shared-file-list__icon {
  flex-shrink: 0;
  color: var(--uikit-icon-muted);
}

.shared-file-list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 名字 16px/500（与成员行名字字号一致），超长省略 */
.shared-file-list__name {
  font-size: var(--uikit-font-size-16);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 副信息（大小/上传者）：次要文本，字号比名字小一档（同列表行 subtitle 做法） */
.shared-file-list__meta {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

/* ⋮ 按钮：与成员列表 .group-member-list__more-btn 同规格——纯净 icon（无边框无底色、
   --uikit-text-secondary），hover 出 --uikit-bg-hover 圆角背景 + 字色加深 */
.shared-file-list__more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: none;
  border-radius: var(--uikit-components-radius);
  background: none;
  color: var(--uikit-text-secondary);
  cursor: pointer;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

@media (hover: hover) {
  .shared-file-list__more-btn:hover {
    background-color: var(--uikit-bg-hover);
    color: var(--uikit-text-primary);
  }
}
</style>
