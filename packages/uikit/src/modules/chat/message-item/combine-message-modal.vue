<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Message as SdkMessage } from 'easemob-websdk'
import { formatSdkError } from '../../../utils/sdk-error'
import { useLocale } from '../../../locale'
import { useUIKit } from '../../../composables/use-uikit'
import { toUiMessage } from '../../../sdk/adapter/message-adapter'
import Icon from '../../../components/icon/icon.vue'
import Popup from '../../../components/popup/popup.vue'
import Empty from '../../../components/empty/empty.vue'
import type { CombineMessageBody, UiMessage } from '../../../sdk/types'
import { useMessageStore } from '../../../store/message'
import CombineMessageModalItem from './combine-message-modal-item.vue'

export interface CombineMessageModalProps {
  show: boolean
  message: UiMessage
}

export interface CombineMessageModalEmits {
  (e: 'update:show', value: boolean): void
  (e: 'view-combine', message: UiMessage): void
}

const props = defineProps<CombineMessageModalProps>()
const emit = defineEmits<CombineMessageModalEmits>()

const { t } = useLocale()
const { client, stores } = useUIKit()
const messageStore = useMessageStore()

/** 是否正在加载 */
const isLoading = ref(false)
/** 解析后的 UIKit 消息列表 */
const parsedMessages = ref<UiMessage[]>([])
/** 加载错误 */
const loadError = ref('')

/** 合并消息体（响应式，支持组件复用时更新） */
const body = computed(() => props.message.body as CombineMessageBody)

const title = computed(() => body.value.title || t('message.forward.combineTitle') || '聊天记录')

/**
 * 将 SDK 解析出的子消息转换为 UiMessage，直接交给 MessageRenderer 复用。
 */
function adaptMessage(sdkMsg: SdkMessage): UiMessage {
  const currentUser = stores.client.currentUser || ''
  return toUiMessage(sdkMsg, currentUser)
}

/** 适配后的消息列表（交给子组件渲染） */
const renderableMessages = computed(() => parsedMessages.value)

/** 点击嵌套合并消息（由子组件的 view-combine 事件触发） */
function onViewCombine(msg: UiMessage) {
  emit('view-combine', msg)
}

/** 下载并解析合并消息（优先读缓存，未命中才调 SDK） */
async function loadMessages() {
  const msgId = props.message?.msgServerId || props.message?.msgLocalId
  // 缓存命中：直接复用不调 SDK
  if (msgId) {
    const cached = messageStore.getParsedCombineMessages(msgId)
    if (cached && cached.length > 0) {
      parsedMessages.value = cached
      return
    }
  }

  const url = body.value.url
  const secret = body.value.secret
  if (!url || !secret) {
    loadError.value = t('message.forward.parseFailed') || '解析失败'
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const result = await client.value.chatManager.downloadAndParseCombineMessage({ url, secret })
    const list = Array.isArray(result) ? result : []
    const finalList = list.map(adaptMessage)
    parsedMessages.value = finalList
    // 写入缓存（仅当解析出非空列表时，避免错误状态被缓存）
    if (msgId && finalList.length > 0) {
      messageStore.setParsedCombineMessages(msgId, finalList)
    }
  }
  catch (e) {
    console.warn('[CombineMessageModal] downloadAndParseCombineMessage failed:', formatSdkError(e))
    const errMsg = e instanceof Error ? e.message : String(e)
    loadError.value = (t('message.forward.parseFailed') || '解析失败') + (errMsg ? `: ${errMsg}` : '')
  }
  finally {
    isLoading.value = false
  }
}

/** 关闭弹窗 */
function onClose() {
  emit('update:show', false)
}

/** 监听显示状态：打开时自动加载（immediate 确保首次挂载时也触发） */
watch(() => props.show, (show) => {
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
          <CombineMessageModalItem
            v-for="(msg, idx) in renderableMessages"
            :key="msg.msgServerId || msg.msgLocalId || idx"
            :message="msg"
            @view-combine="onViewCombine"
          />
        </div>

        <!-- 空状态 -->
        <Empty
          v-else
          icon="empty/chat"
          :description="t('message.forward.combineEmpty') || '暂无消息'"
          size="small"
        />
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
  flex-shrink: 0;
}

.combine-message-modal__header-icon {
  color: var(--uikit-text-secondary);
  flex-shrink: 0;
}

.combine-message-modal__header-title {
  font-size: var(--uikit-font-size-16);
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
  font-size: var(--uikit-font-size-14);
}

.combine-message-modal__loading-icon {
  animation: combine-modal-spin 1s linear infinite;
  color: var(--uikit-text-secondary);
}

@keyframes combine-modal-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.combine-message-modal__error {
  text-align: center;
  padding: 40px 0;
  color: #ef4444;
  font-size: var(--uikit-font-size-14);
}

.combine-message-modal__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
