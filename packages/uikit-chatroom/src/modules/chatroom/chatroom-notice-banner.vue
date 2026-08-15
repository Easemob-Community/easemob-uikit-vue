<script setup lang="ts">
/**
 * 聊天室公告条：公告非空时展示在消息区上方，可手动关闭（本次会话内）。
 * 公告变更事件会实时同步 store（onAnnouncementChanged → 公告更新通知入消息流）。
 */
import { ref, watch } from 'vue'
import { EmIconButton, t } from '@easemob/uikit-core'

export interface ChatroomNoticeBannerProps {
  /** 公告内容（空串不渲染） */
  content: string
}

const props = defineProps<ChatroomNoticeBannerProps>()

/** 用户关闭标记（公告变化时重置） */
const dismissed = ref(false)
watch(() => props.content, () => {
  dismissed.value = false
})
</script>

<template>
  <div v-if="content && !dismissed" class="chatroom-notice-banner">
    <span class="chatroom-notice-banner__tag">{{ t('chatroom.ui.announcement') }}</span>
    <span class="chatroom-notice-banner__content">{{ content }}</span>
    <EmIconButton
      class="chatroom-notice-banner__close"
      icon="actions/close"
      size="small"
      :title="t('chatroom.ui.close')"
      @click="dismissed = true"
    />
  </div>
</template>

<style scoped>
.chatroom-notice-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--uikit-bg-warning, rgba(243, 200, 80, 0.12));
  font-size: 12px;
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.chatroom-notice-banner__tag {
  flex-shrink: 0;
  color: var(--uikit-warning-color, #f3c850);
}

.chatroom-notice-banner__content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chatroom-notice-banner__close {
  flex-shrink: 0;
}
</style>
