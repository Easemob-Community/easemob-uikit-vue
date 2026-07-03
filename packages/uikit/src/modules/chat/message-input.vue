<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useQuote } from '../../composables/use-quote'
import { useViewport } from '../../composables/use-viewport'
import { useToast } from '../../composables/use-toast'
import EmojiPicker from '../../components/emoji-picker/emoji-picker.vue'
import Popup from '../../components/popup/popup.vue'
import { useLocale } from '../../locale'
import type { UiMessage } from '../../sdk/types'
import SimpleInput from './message-input/simple-input.vue'
import RichInput from './message-input/rich-input.vue'
import EditingBar from './message-input/editing-bar.vue'
import MentionPicker from './mention/mention-picker.vue'
import QuoteBar from './quote/quote-bar.vue'
import type { ChatConfig, ChatSendHooks, MentionContact } from './types'

export interface MessageInputProps {
  config?: ChatConfig
  /** 当前是否为群聊 */
  isGroup?: boolean
  /** 键盘高度（H5 适配用） */
  keyboardHeight?: number
}

export interface MessageInputEmits {
  (e: 'send-success'): void
  /** 输入框聚焦时触发（H5 键盘弹起后需滚动消息列表） */
  (e: 'focus'): void
}

const props = defineProps<MessageInputProps>()
const emit = defineEmits<MessageInputEmits>()

const { sendTextMessage, sendImageMessage, sendFileMessage, sendAudioMessage, sendVideoMessage, editingMessage, exitEditMode, modifyTextMessage, sendTypingCmd } = useChat()
const { quotedMessage, clearQuote, buildQuoteExt } = useQuote()
const { isMobile } = useViewport()
const { show: showToast } = useToast()
const { t } = useLocale()

/** 输入框配置 */
const inputConfig = computed(() => props.config?.input)

/** 发送钩子 */
const sendHooks = computed<ChatSendHooks | undefined>(() => props.config?.hooks)

/**
 * 执行 beforeSend 钩子
 * @returns true 表示允许发送，false 表示阻止
 */
async function runBeforeSend(message: Partial<UiMessage>): Promise<boolean> {
  const hook = sendHooks.value?.beforeSend
  if (!hook)
    return true
  try {
    const result = await hook(message)
    return result !== false
  }
  catch (e) {
    console.error('[MessageInput] beforeSend hook error:', e)
    return true
  }
}

/**
 * 执行 afterSend 钩子
 */
function runAfterSend(message: any) {
  const hook = sendHooks.value?.afterSend
  if (hook) {
    try {
      hook(message)
    }
    catch (e) {
      console.error('[MessageInput] afterSend hook error:', e)
    }
  }
}

/** 输入框模式 */
const inputMode = computed(() => {
  // H5 端强制降级为 simple 模式
  if (isMobile.value)
    return 'simple'
  return inputConfig.value?.mode ?? 'simple'
})

/** Emoji 选择器显示状态 */
const showEmojiPicker = ref(false)

/** Emoji 锚点元素 */
const emojiAnchorRef = ref<HTMLElement>()

/** MentionPicker 显示状态 */
const showMentionPicker = ref(false)

/** MentionPicker 锚点元素 */
const mentionAnchorRef = ref<HTMLElement>()

/** Mention 过滤关键词 */
const mentionKeyword = ref('')

/** 是否启用 @提及 */
const enableMention = computed(() => {
  const cfg = inputConfig.value
  if (cfg?.features?.mention === false)
    return false
  const onlyInGroup = cfg?.mention?.onlyInGroup ?? true
  if (onlyInGroup && !props.isGroup)
    return false
  return true
})

/** @提及联系人列表 */
const mentionContacts = computed(() => inputConfig.value?.mention?.contacts ?? [])

/** SimpleInput 引用 */
const simpleInputRef = ref<InstanceType<typeof SimpleInput>>()

/** message-input 根元素引用 */
const messageInputRef = ref<HTMLElement>()

/** RichInput 引用 */
const richInputRef = ref<InstanceType<typeof RichInput>>()

/** 群已读回执配置 */
const groupReadReceiptConfig = computed(() => props.config?.groupReadReceipt)

/** 构造包含引用 ext 的合并对象；无引用时返回 undefined */
function buildExtWithQuote(): Record<string, any> | undefined {
  if (!quotedMessage.value)
    return undefined
  return { ...buildQuoteExt(quotedMessage.value) }
}

/** 取消编辑：退出编辑态并清空输入 */
function handleCancelEdit() {
  exitEditMode()
  setText('')
}

/** 发送文本消息（或提交编辑） */
async function handleSendText(text: string, mentionList?: MentionContact[]) {
  // 编辑模式：改为调用 modifyMessage
  if (editingMessage.value) {
    const target = editingMessage.value
    modifyTextMessage(target, text)
      .then(() => {
        setText('')
        emit('send-success')
      })
      .catch((e: any) => {
        const code = e?.type ?? e?.code
        const msg = code === 'modifiedCountExceedLimit' || /limit|count|5/i.test(String(e?.message || ''))
          ? t('message.edit.limitReached')
          : t('message.edit.failed')
        showToast(msg)
      })
    return
  }
  let ext = buildExtWithQuote()
  // 如果有 mention，写入 ext.em_at_list
  if (mentionList && mentionList.length > 0) {
    ext = ext || {}
    ext.em_at_list = mentionList.map(m => m.userId)
  }
  // beforeSend 拦截
  const canSend = await runBeforeSend({ type: 'text', body: { content: text } })
  if (!canSend)
    return
  sendTextMessage(text, ext)
    .then((msg) => {
      emit('send-success')
      runAfterSend(msg)
    })
    .catch((e: any) => {
      console.error('[MessageInput] sendTextMessage failed:', e)
      showToast(e?.message || t('message.send.failed') || '发送失败')
    })
  clearQuote()
}

/** 发送富文本消息（或提交编辑） */
async function handleSendRich(_html: string, text: string, mentionList?: MentionContact[]) {
  if (editingMessage.value) {
    const target = editingMessage.value
    modifyTextMessage(target, text)
      .then(() => {
        setText('')
        emit('send-success')
      })
      .catch((e: any) => {
        const code = e?.type ?? e?.code
        const msg = code === 'modifiedCountExceedLimit' || /limit|count|5/i.test(String(e?.message || ''))
          ? t('message.edit.limitReached')
          : t('message.edit.failed')
        showToast(msg)
      })
    return
  }
  let ext = buildExtWithQuote()
  // 如果有 mention，写入 ext.em_at_list
  if (mentionList && mentionList.length > 0) {
    ext = ext || {}
    ext.em_at_list = mentionList.map(m => m.userId)
  }
  // beforeSend 拦截
  const canSend = await runBeforeSend({ type: 'text', body: { content: text } })
  if (!canSend)
    return
  sendTextMessage(text, ext)
    .then((msg) => {
      emit('send-success')
      runAfterSend(msg)
    })
    .catch((e: any) => {
      console.error('[MessageInput] sendTextMessage failed:', e)
      showToast(e?.message || t('message.send.failed') || '发送失败')
    })
  clearQuote()
}

/** 待回收的 Blob URL 列表 */
const pendingBlobUrls = new Set<string>()

/** 发送文件消息 */
async function handleSendFile(type: 'image' | 'file' | 'video', files: FileList) {
  const file = files[0]
  if (!file)
    return

  const ext = buildExtWithQuote()

  // beforeSend 拦截
  const canSend = await runBeforeSend({ type: type === 'image' ? 'image' : type })
  if (!canSend)
    return

  let promise: Promise<any> | undefined
  if (type === 'image') {
    promise = sendImageMessage(file, groupReadReceiptConfig.value, ext)
  }
  else if (type === 'video') {
    const duration = await getVideoDuration(file)
    promise = sendVideoMessage(file, duration, groupReadReceiptConfig.value, ext)
  }
  else {
    promise = sendFileMessage(file, groupReadReceiptConfig.value, ext)
  }
  promise?.then((msg) => {
    emit('send-success')
    runAfterSend(msg)
  }).catch((e: any) => {
    console.error('[MessageInput] sendFile failed:', e)
    showToast(e?.message || t('message.send.failed') || '发送失败')
  })
  clearQuote()
}

/** 读取本地视频时长（秒），失败或无法读取时兜底返回 1 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(1)
      return
    }
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    let settled = false
    const finish = (duration: number) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      resolve(Math.max(1, Math.floor(duration || 0)))
    }

    video.addEventListener('loadedmetadata', () => finish(video.duration))
    video.addEventListener('error', () => finish(1))

    // 5s 超时兜底
    setTimeout(() => finish(1), 5000)
  })
}

/** 打开 Emoji 选择器 */
function onEmojiClick(anchorEl: HTMLElement) {
  emojiAnchorRef.value = anchorEl
  showEmojiPicker.value = true
}

/** 选择 Emoji */
function onEmojiSelect(emoji: string) {
  showEmojiPicker.value = false
  if (inputMode.value === 'simple') {
    simpleInputRef.value?.insertEmoji?.(emoji)
  }
  else {
    richInputRef.value?.insertEmoji?.(emoji)
  }
}

/** 清理 @提及锚点 DOM */
function cleanupMentionAnchor() {
  if (mentionAnchorRef.value && mentionAnchorRef.value.parentNode) {
    mentionAnchorRef.value.parentNode.removeChild(mentionAnchorRef.value)
  }
  mentionAnchorRef.value = undefined
}

/** 触发 @提及 */
function onMentionTrigger(anchor: HTMLElement, keyword: string) {
  // 先清理旧锚点
  cleanupMentionAnchor()
  mentionAnchorRef.value = anchor
  mentionKeyword.value = keyword
  showMentionPicker.value = true
}

/** 关闭 @提及 */
function onMentionClose() {
  showMentionPicker.value = false
  cleanupMentionAnchor()
}

/** 选择 @提及联系人 */
function onMentionSelect(contact: MentionContact) {
  showMentionPicker.value = false
  const name = contact.remark || contact.name
  if (inputMode.value === 'simple') {
    simpleInputRef.value?.insertMention?.(contact)
  }
  else {
    richInputRef.value?.insertMention?.(name, contact)
  }
  // 选择后清理锚点
  cleanupMentionAnchor()
}

/** mention 关闭时清理锚点 */
watch(showMentionPicker, (val) => {
  if (!val) {
    cleanupMentionAnchor()
  }
})

// ===== 语音录制相关 =====

/** MediaRecorder 实例 */
let mediaRecorder: MediaRecorder | null = null

/** 音频数据块 */
let audioChunks: Blob[] = []

/** 录音开始时间戳 */
let recordingStartTime = 0

/** 录音麦克风流 */
let voiceStream: MediaStream | null = null

/** 是否已取消录音 */
let isVoiceCancelled = false

/** 录音启动期间被要求停止的标志 */
let shouldCancelVoice = false

/** 开始录音 */
async function handleVoiceStart() {
  isVoiceCancelled = false
  shouldCancelVoice = false
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(voiceStream)
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0)
        audioChunks.push(e.data)
    }

    mediaRecorder.start()
    recordingStartTime = Date.now()

    // 如果启动期间被要求停止，立即取消
    if (shouldCancelVoice) {
      handleVoiceCancel()
    }
  }
  catch (err) {
    console.error('录音启动失败:', err)
    showToast('录音启动失败，请检查麦克风权限')
    // 清理
    voiceStream?.getTracks().forEach(track => track.stop())
    voiceStream = null
    mediaRecorder = null
  }
}

/** 停止录音并发送 */
function handleVoiceEnd(durationFromInput?: number) {
  if (!mediaRecorder) {
    // 还没启动完成，标记需要取消
    shouldCancelVoice = true
    return
  }

  const actualDuration
    = durationFromInput ?? Math.floor((Date.now() - recordingStartTime) / 1000)

  const mr = mediaRecorder

  // 如果还没开始录音（state 为 inactive），直接清理资源
  if (mr.state === 'inactive') {
    voiceStream?.getTracks().forEach(track => track.stop())
    audioChunks = []
    voiceStream = null
    mediaRecorder = null
    return
  }

  mediaRecorder.onstop = async () => {
    voiceStream?.getTracks().forEach(track => track.stop())

    if (!isVoiceCancelled && audioChunks.length > 0) {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      const ext = buildExtWithQuote()
      // beforeSend 拦截
      const canSend = await runBeforeSend({ type: 'voice' })
      if (!canSend) {
        clearQuote()
        return
      }
      sendAudioMessage(new File([blob], 'voice.webm', { type: blob.type }), actualDuration, undefined, ext)
        .then((msg) => {
          emit('send-success')
          runAfterSend(msg)
        })
        .catch((e: any) => {
          console.error('[MessageInput] sendAudioMessage failed:', e)
          showToast(e?.message || t('message.send.failed') || '发送失败')
        })
      clearQuote()
    }

    audioChunks = []
    voiceStream = null
    if (mr === mediaRecorder)
      mediaRecorder = null
  }

  mr.stop()
}

/** 取消录音 */
function handleVoiceCancel() {
  isVoiceCancelled = true
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  voiceStream?.getTracks().forEach(track => track.stop())
  mediaRecorder = null
  voiceStream = null
  audioChunks = []
}

/** 组件卸载时清理锚点与 Blob URL */
onBeforeUnmount(() => {
  cleanupMentionAnchor()
  // 回收所有未释放的 Blob URL
  pendingBlobUrls.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  pendingBlobUrls.clear()
  // 清理录音资源
  handleVoiceCancel()
})

/** 设置输入文本（用于重新编辑等场景） */
function setText(value: string) {
  if (inputMode.value === 'simple') {
    simpleInputRef.value?.setText?.(value)
  }
  else {
    richInputRef.value?.setText?.(value)
  }
}

/** 获取当前输入文本 */
function getText(): string {
  if (inputMode.value === 'simple') {
    return simpleInputRef.value?.getText?.() || ''
  }
  else {
    return richInputRef.value?.getText?.() || ''
  }
}

defineExpose({
  setText,
  getText,
})
</script>

<template>
  <div
    ref="messageInputRef"
    class="message-input"
    :style="{ paddingBottom: `${props.keyboardHeight || 0}px` }"
  >
    <!-- 编辑条：优先于引用条 -->
    <EditingBar
      v-if="editingMessage"
      :message="editingMessage"
      @close="handleCancelEdit"
    />

    <!-- 引用条 -->
    <QuoteBar
      v-if="!editingMessage && quotedMessage"
      :message="quotedMessage"
      @close="clearQuote"
    />

    <!-- 简单输入框 -->
    <SimpleInput
      v-if="inputMode === 'simple'"
      ref="simpleInputRef"
      :config="inputConfig"
      :enable-mention="enableMention"
      @send="handleSendText"
      @send-file="handleSendFile"
      @emoji-click="onEmojiClick"
      @voice-start="handleVoiceStart"
      @voice-end="handleVoiceEnd"
      @voice-cancel="handleVoiceCancel"
      @mention-trigger="onMentionTrigger"
      @mention-close="onMentionClose"
      @typing="sendTypingCmd"
      @focus="emit('focus')"
    />

    <!-- 富文本输入框 -->
    <RichInput
      v-else
      ref="richInputRef"
      :config="inputConfig"
      :enable-mention="enableMention"
      @send="handleSendRich"
      @send-file="handleSendFile"
      @emoji-click="onEmojiClick"
      @mention-trigger="onMentionTrigger"
      @mention-close="onMentionClose"
      @focus="emit('focus')"
    />

    <!-- PC 端 Emoji Popup -->
    <Popup
      v-if="!isMobile"
      :show="showEmojiPicker"
      :anchor="emojiAnchorRef"
      :boundary="messageInputRef"
      placement="top"
      :overlay="false"
      @update:show="showEmojiPicker = $event"
    >
      <div class="emoji-picker-wrapper">
        <EmojiPicker
          :show="true"
          @select="onEmojiSelect"
          @update:show="showEmojiPicker = $event"
        />
      </div>
    </Popup>

    <!-- H5 端 Emoji ActionSheet（简化：底部弹层） -->
    <div
      v-if="isMobile && showEmojiPicker"
      class="message-input__emoji-sheet"
    >
      <div class="message-input__emoji-sheet-mask" @click="showEmojiPicker = false" />
      <Transition name="uikit-slide-up">
        <div v-show="showEmojiPicker" class="message-input__emoji-sheet-content">
          <div class="emoji-picker-wrapper">
            <EmojiPicker
              :show="true"
              @select="onEmojiSelect"
              @update:show="showEmojiPicker = $event"
            />
          </div>
        </div>
      </Transition>
    </div>

    <!-- @提及选择器 -->
    <MentionPicker
      v-if="enableMention"
      :show="showMentionPicker"
      :contacts="mentionContacts"
      :keyword="mentionKeyword"
      :anchor="mentionAnchorRef"
      @update:show="showMentionPicker = $event"
      @select="onMentionSelect"
    />
  </div>
</template>

<style>
/* 表情选择器包裹层：hover 阴影效果（非 scoped，因 Popup 使用 Teleport） */
.emoji-picker-wrapper {
  width: 320px;
  border-radius: var(--uikit-components-radius, 12px);
  background: var(--uikit-bg-base);
  border: 1px solid var(--uikit-border, rgba(0, 0, 0, 0.08));
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 12px 40px rgba(0, 0, 0, 0.14);
}
</style>

<style scoped>
.message-input {
  position: relative;
}

/* H5 Emoji 底部弹层 */
.message-input__emoji-sheet {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.message-input__emoji-sheet-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
}

.message-input__emoji-sheet-content {
  position: relative;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 16px) var(--uikit-components-radius, 16px) 0 0;
  padding: 12px 12px calc(12px + var(--uikit-safe-bottom, 0px)) 12px;
}
</style>
