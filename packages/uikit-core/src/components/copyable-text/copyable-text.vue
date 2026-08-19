<script setup lang="ts">
import IconButton from '../icon-button/icon-button.vue'
import { useLocale } from '../../locale'
import { useToast } from '../../composables/use-toast'

export interface CopyableTextProps {
  /** 需要展示并复制的文本 */
  text: string
  /** 前置标签，例如 'ID:' */
  label?: string
  /** 是否显示复制图标，默认 true */
  showIcon?: boolean
  /** 复制图标尺寸，默认 16 */
  iconSize?: number
}

const props = withDefaults(defineProps<CopyableTextProps>(), {
  showIcon: true,
  iconSize: 16,
})

const { t } = useLocale()
const { show: showToast } = useToast()

async function copyText() {
  if (!props.text)
    return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(props.text)
    }
    else {
      // http 或非安全域 fallback
      const textarea = document.createElement('textarea')
      textarea.value = props.text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    showToast(t('message.copySuccess', '已复制'), 'success')
  }
  catch {
    showToast(t('message.copyFailed', '复制失败'), 'error')
  }
}
</script>

<template>
  <div class="copyable-text">
    <span v-if="props.label" class="copyable-text__label">{{ props.label }}</span>
    <span class="copyable-text__text" :title="props.text">{{ props.text }}</span>
    <IconButton
      v-if="props.showIcon"
      class="copyable-text__btn"
      icon="rects"
      :icon-size="props.iconSize"
      variant="ghost"
      :title="t('common.copy', '复制')"
      @click.stop="copyText"
    />
  </div>
</template>

<style scoped>
.copyable-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.copyable-text__label {
  flex-shrink: 0;
  font-size: inherit;
  color: var(--uikit-text-secondary);
}

.copyable-text__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: inherit;
  color: var(--uikit-text-secondary);
}

.copyable-text__btn {
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity var(--uikit-anim-duration);
}

@media (hover: hover) {
  .copyable-text:hover .copyable-text__btn,
  .copyable-text__btn:hover {
    opacity: 1;
  }
}
</style>
