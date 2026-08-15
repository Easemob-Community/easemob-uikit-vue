<script setup lang="ts">
/**
 * 聊天室消息项（简化气泡：文本 / 图片 / 自定义消息兜底 / 系统通知 / 撤回标记）。
 * 聊天室为广播流，无未读/回执/会话语义，不展示时间分组与已读状态。
 * 接收侧渲染节流在 store 层（缓冲队列按 150ms 窗口批量合并），本组件只负责单条渲染。
 */
import { computed, onUnmounted } from 'vue'
import { EmAvatar, MESSAGE_TYPE, normalizeUserId, t, useUserInfo } from '@easemob/uikit-core'
import type { UiMessage } from '@easemob/uikit-core'
import { useChatroomMember } from '../../composables/use-chatroom-member'

export interface ChatroomMessageItemProps {
  /** 待渲染消息（SDK 消息或本地系统通知） */
  message: UiMessage
}

const props = defineProps<ChatroomMessageItemProps>()

// 只消费公开 composable 契约（§5.10：禁止直取 store，P2 review P1-1）
const { muteList } = useChatroomMember()

/** 系统通知消息（成员进出/禁言/公告等，居中灰条） */
const isNotice = computed(() => props.message.type === MESSAGE_TYPE.NOTICE)

/** 消息类型分支（模板内避免硬编码字面量，P2 review P1-7） */
const isText = computed(() => props.message.type === MESSAGE_TYPE.TEXT)
const isImage = computed(() => props.message.type === MESSAGE_TYPE.IMAGE)
const isCustom = computed(() => props.message.type === MESSAGE_TYPE.CUSTOM)

/** 消息发送者 ID（notice 无发送者；适配器已按会话用户归一化） */
const senderId = computed(() => (isNotice.value ? '' : normalizeUserId(props.message.from ?? '')))
const { displayName, avatarUrl } = useUserInfo(senderId)

/** 文本内容（txt 消息体） */
const textContent = computed(() => {
  const msg = props.message
  if (msg.type === MESSAGE_TYPE.TEXT)
    return (msg.body as { content?: string }).content ?? ''
  return ''
})

/** 本地图片预览 URL（组件生命周期内最多创建一个，卸载时 revoke） */
let localPreviewUrl = ''

/** 图片地址（img 消息体：thumb 优先，回落原图；本地乐观上屏阶段 body.data 为 File 时生成本地预览） */
const imageUrl = computed(() => {
  const msg = props.message
  if (msg.type !== MESSAGE_TYPE.IMAGE)
    return ''
  const body = msg.body as { thumb?: string, url?: string, originalUrl?: string, data?: File }
  const remote = body.thumb || body.url || body.originalUrl
  if (remote)
    return remote
  // 自己发送的图片：上传完成前没有服务端 URL，用 objectURL 显示本地预览
  // （发送成功后消息体带 thumb/url，走 remote 分支；本地 URL 随组件卸载 revoke）
  if (body.data instanceof File) {
    if (!localPreviewUrl)
      localPreviewUrl = URL.createObjectURL(body.data)
    return localPreviewUrl
  }
  return ''
})

onUnmounted(() => {
  if (localPreviewUrl) {
    URL.revokeObjectURL(localPreviewUrl)
    localPreviewUrl = ''
  }
})

/** 自定义消息 event 名（P3 礼物等场景渲染走容器 message-custom 插槽，此处兜底） */
const customEvent = computed(() => {
  const msg = props.message
  if (msg.type !== MESSAGE_TYPE.CUSTOM)
    return ''
  return (msg.body as { event?: string }).event ?? ''
})

/** 已撤回标记（广播场景撤回仅从简：打标提示） */
const isRecalled = computed(() => props.message.recalled === true)

/** 系统通知文案（notice 消息体） */
const noticeContent = computed(() =>
  (props.message as { body?: { content?: string } }).body?.content ?? '')

/** 发送者是否在禁言名单（双方都归一化后比较，P2 review P2-4） */
const isMutedMember = computed(() =>
  muteList.value.some(item => normalizeUserId(item.userId) === senderId.value))
</script>

<template>
  <!-- 系统通知：居中中性灰条 -->
  <div v-if="isNotice" class="chatroom-message-item chatroom-message-item--notice">
    {{ noticeContent }}
  </div>

  <!-- 已撤回：居中灰条（不发系统事件） -->
  <div v-else-if="isRecalled" class="chatroom-message-item chatroom-message-item--recalled">
    {{ t('chatroom.ui.recalled') }}
  </div>

  <!-- 普通消息：他人消息带头像昵称，自己消息右对齐 -->
  <div v-else class="chatroom-message-item" :class="{ 'chatroom-message-item--self': message.isSelf }">
    <template v-if="!message.isSelf">
      <EmAvatar :src="avatarUrl || undefined" :name="displayName" :size="32" />
      <div class="chatroom-message-item__main">
        <div class="chatroom-message-item__sender">
          {{ displayName }}
          <span v-if="isMutedMember" class="chatroom-message-item__muted-tag">{{ t('chatroom.ui.memberMuted') }}</span>
        </div>
        <div class="chatroom-message-item__bubble">
          <!-- 文本 -->
          <template v-if="isText">
            {{ textContent }}
          </template>
          <!-- 图片 -->
          <img
            v-else-if="isImage && imageUrl"
            class="chatroom-message-item__image"
            :src="imageUrl"
            :alt="textContent || 'image'"
          >
          <!-- 自定义消息兜底（P3 场景渲染可经容器 message-custom 插槽覆盖） -->
          <span v-else-if="isCustom">{{ t('chatroom.ui.customMessage') }}{{ customEvent ? ` ${customEvent}` : '' }}</span>
          <!-- 未知类型兜底 -->
          <span v-else>{{ t('chatroom.ui.unknownMessage') }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="chatroom-message-item__bubble chatroom-message-item__bubble--self">
        <template v-if="isText">
          {{ textContent }}
        </template>
        <img
          v-else-if="isImage && imageUrl"
          class="chatroom-message-item__image"
          :src="imageUrl"
          alt="image"
        >
        <span v-else-if="isCustom">{{ t('chatroom.ui.customMessage') }}{{ customEvent ? ` ${customEvent}` : '' }}</span>
        <span v-else>{{ t('chatroom.ui.unknownMessage') }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chatroom-message-item {
  display: flex;
  gap: 8px;
  padding: 6px 16px;
  align-items: flex-start;
}

.chatroom-message-item--notice,
.chatroom-message-item--recalled {
  justify-content: center;
  font-size: 12px;
  color: var(--uikit-text-secondary);
  padding: 10px 24px;
}

.chatroom-message-item--self {
  justify-content: flex-end;
}

.chatroom-message-item__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  max-width: 72%;
}

.chatroom-message-item__sender {
  font-size: 12px;
  color: var(--uikit-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.chatroom-message-item__muted-tag {
  color: var(--uikit-text-tertiary);
}

.chatroom-message-item__bubble {
  background: var(--uikit-bubble-bg-other, var(--uikit-bg-secondary));
  color: var(--uikit-bubble-text-other, var(--uikit-text-primary));
  padding: 8px 12px;
  border-radius: var(--uikit-radius-md, 8px);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 100%;
}

.chatroom-message-item__bubble--self {
  background: var(--uikit-bubble-bg-self, var(--uikit-primary-color));
  color: var(--uikit-bubble-text-self, #fff);
}

.chatroom-message-item__image {
  max-width: 200px;
  max-height: 240px;
  border-radius: var(--uikit-radius-md, 8px);
  display: block;
  object-fit: cover;
}
</style>
