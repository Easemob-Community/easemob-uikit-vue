<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Popup from '../../../components/popup/popup.vue'
import Icon from '../../../components/icon/icon.vue'
import MessageRenderer from './message-renderer.vue'
import { useLocale } from '../../../locale'
import { getClient } from '../../../sdk/client'
import type { SdkMessage } from '../../../sdk/client'
import { useClientStore } from '../../../store/client'
import { useMessageStore } from '../../../store/message'
import { MESSAGE_STATUS } from '../../../constants'
import type { Message } from '../../../store/message'

export interface CombineMessageModalProps {
  show: boolean
  message: Message
}

export interface CombineMessageModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'view-combine', message: Message): void
}

const props = defineProps<CombineMessageModalProps>()
const emit = defineEmits<CombineMessageModalEmits>()

const { t } = useLocale()

/** 是否正在加载 */
const isLoading = ref(false)
/** 解析后的消息列表（桥接 SDK Message 与 UIKit Message 两种类型） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parsedMessages = ref<any[]>([])
/** 加载错误 */
const loadError = ref('')

/** 合并消息特有的字段（响应式，支持组件复用时更新） */
const combineMsg = computed(() => props.message as unknown as {
  title?: string
  summary?: string
  compatibleText?: string
  url?: string
  secret?: string
})

const title = computed(() => combineMsg.value.title || t('message.forward.combineTitle') || '聊天记录')

/** 格式化时间 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** 当前登录用户 ID（用于判断 isSelf） */
const clientStore = useClientStore()
/** 消息 store：提供合并消息解析缓存 */
const messageStore = useMessageStore()

/**
 * 将解析出的原始消息体适配为 Message 类型，补全 UI 计算字段。
 * 这样可以直接交给 MessageRenderer 复用（图片/视频/文件/语音/嵌套合并等都能渲染）。
 */
function adaptMessage(msg: SdkMessage): Message {
  const currentUser = clientStore.currentUser || ''
  const from = msg.from || ''
  const time = msg.timestamp || Date.now()
  const body = msg.body || {} as Record<string, any>
  return {
    id: msg.msgServerId || msg.msgLocalId || '',
    serverId: msg.msgServerId || '',
    from: from,
    to: msg.to || '',
    conversationId: msg.conversationId || msg.to || from,
    conversationType: (msg.conversationType as any) || 'groupChat',
    isSelf: !!from && from === currentUser,
    status: MESSAGE_STATUS.SENT,
    timestamp: time,
    type: (msg.type || 'text') as Message['type'],
    ext: msg.ext as Record<string, unknown> | undefined,
    content: (body as any).content,
    url: (body as any).url,
    filename: (body as any).filename,
    fileSize: (body as any).fileSize,
    duration: (body as any).duration,
  } as Message
}

/** 适配后的消息列表（交给 MessageRenderer 渲染） */
const renderableMessages = computed(() => parsedMessages.value.map(adaptMessage))

/** 格式化发送者名称：优先 ext 里的 nickname */
function formatSender(msg: Message): string {
  const ext = msg.ext?.ease_chat_uikit_user_info as Record<string, string> | undefined
  return ext?.nickname || ext?.remark || msg.from || 'Unknown'
}

/** 点击嵌套合并消息（由 MessageRenderer 的 view-combine 事件触发） */
function onViewCombine(msg: Message) {
  emit('view-combine', msg)
}

/** 下载并解析合并消息（优先读缓存，未命中才调 SDK） */
async function loadMessages() {
  const msgId = props.message?.id
  // 缓存命中：直接复用不调 SDK
  if (msgId) {
    const cached = messageStore.getParsedCombineMessages(msgId)
    if (cached && cached.length > 0) {
      console.log('[CombineMessageModal] cache hit, msgId =', msgId, 'count =', cached.length)
      parsedMessages.value = cached
      return
    }
  }

  const url = combineMsg.value.url
  const secret = combineMsg.value.secret
  if (!url || !secret) {
    loadError.value = t('message.forward.parseFailed') || '解析失败'
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const client = getClient()
    if (!client) {
      loadError.value = t('message.forward.parseFailed') || '解析失败'
      return
    }
    /**
     * @see SDK_DEFICIENCY: downloadAndParseCombineMessage 要求传入 { message: Message }，
     * 但业务层保存的是 { url, secret } 格式的参数。此处使用 as any 桥接两种调用方式。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client.chatManager as any).downloadAndParseCombineMessage({ url, secret } as any)
    console.log('[CombineMessageModal] downloadAndParseCombineMessage result:', result)
    // SDK 返回 ReadonlyArray<Message>
    const list = Array.isArray(result) ? result : (result as any)?.data
    const finalList = Array.isArray(list) ? list : []
    parsedMessages.value = finalList
    // 写入缓存（仅当解析出非空列表时，避免错误状态被缓存）
    if (msgId && finalList.length > 0) {
      messageStore.setParsedCombineMessages(msgId, finalList)
    }
  } catch (e) {
    console.warn('[CombineMessageModal] downloadAndParseCombineMessage failed:', e)
    const errMsg = e instanceof Error ? e.message : String(e)
    loadError.value = (t('message.forward.parseFailed') || '解析失败') + (errMsg ? `: ${errMsg}` : '')
  } finally {
    isLoading.value = false
  }
}

/** 关闭弹窗 */
function onClose() {
  emit('update:show', false)
}

/** 监听显示状态：打开时自动加载（immediate 确保首次挂载时也触发） */
watch(() => props.show, (show) => {
  console.log('[CombineMessageModal] watch show =', show, 'message id =', props.message?.id)
  if (show) {
    parsedMessages.value = []
    loadError.value = ''
    loadMessages()
  }
}, { immediate: true })
</script>

<template>
  <Popup
    :show="props.show"
    position="center"
    :show-close="true"
    :close-on-click-overlay="true"
    @update:show="(v: boolean) => emit('update:show', v)"
    @close="onClose"
  >
    <div class="combine-message-modal">
      <!-- 标题栏 -->
      <div class="combine-message-modal__header">
        <Icon name="files-media/folder" :size="18" class="combine-message-modal__header-icon" />
        <span class="combine-message-modal__header-title">{{ title }}</span>
      </div>

      <!-- 内容区 -->
      <div class="combine-message-modal__body">
        <!-- 加载中 -->
        <div v-if="isLoading" class="combine-message-modal__loading">
          <Icon name="actions/loading_circle" :size="20" class="combine-message-modal__loading-icon" />
          <span>{{ t('message.forward.parsing') || '解析中...' }}</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="loadError" class="combine-message-modal__error">
          {{ loadError }}
        </div>

        <!-- 消息列表：复用 MessageRenderer，自动获得图片/视频/文件/语音/嵌套合并等完整渲染能力 -->
        <div v-else-if="renderableMessages.length > 0" class="combine-message-modal__list">
          <div
            v-for="(msg, idx) in renderableMessages"
            :key="msg.id || idx"
            class="combine-message-modal__item"
          >
            <!-- 头像占位 -->
            <div class="combine-message-modal__item-avatar">
              {{ formatSender(msg).charAt(0).toUpperCase() }}
            </div>
            <!-- 内容 -->
            <div class="combine-message-modal__item-content">
              <div class="combine-message-modal__item-meta">
                <span class="combine-message-modal__item-sender">{{ formatSender(msg) }}</span>
                <span class="combine-message-modal__item-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="combine-message-modal__item-bubble">
                <MessageRenderer :message="msg" @view-combine="onViewCombine" />
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="combine-message-modal__empty">
          {{ t('message.forward.combineEmpty') || '暂无消息' }}
        </div>
      </div>
    </div>
  </Popup>
</template>

<style scoped>
.combine-message-modal {
  width: 420px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: 12px;
}

.combine-message-modal__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--uikit-border-color, #e5e7eb);
  flex-shrink: 0;
}

.combine-message-modal__header-icon {
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.combine-message-modal__header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.combine-message-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  min-height: 120px;
}

.combine-message-modal__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--uikit-text-secondary);
  font-size: 14px;
}

.combine-message-modal__loading-icon {
  animation: combine-modal-spin 1s linear infinite;
  color: var(--uikit-text-secondary);
}

@keyframes combine-modal-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.combine-message-modal__error {
  text-align: center;
  padding: 40px 0;
  color: #ef4444;
  font-size: 14px;
}

.combine-message-modal__empty {
  text-align: center;
  padding: 40px 0;
  color: var(--uikit-text-secondary);
  font-size: 14px;
}

.combine-message-modal__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.combine-message-modal__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.15s;
}

.combine-message-modal__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.combine-message-modal__item--combine {
  cursor: pointer;
}

.combine-message-modal__item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--uikit-primary-color, #5f6df3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.combine-message-modal__item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.combine-message-modal__item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.combine-message-modal__item-sender {
  font-size: 13px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.combine-message-modal__item-time {
  font-size: 11px;
  color: var(--uikit-text-secondary);
}

.combine-message-modal__item-bubble {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  word-break: break-word;
  /* 限制嵌套渲染的媒体宽度，避免超出弹窗 */
  max-width: 100%;
}

.combine-message-modal__item-bubble :deep(img),
.combine-message-modal__item-bubble :deep(video) {
  max-width: 240px;
  max-height: 240px;
  border-radius: 6px;
}
</style>
