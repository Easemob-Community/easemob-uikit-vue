<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { formatSdkError, resolveSdkErrorMessage } from '../../../utils/sdk-error'
import { useChat } from '../../../composables/use-chat'
import { useQuote } from '../../../composables/use-quote'
import { provideMessageInputPluginContext } from '../../../composables/use-chat-plugin'
import { useViewport } from '../../../composables/use-viewport'
import { useToast } from '../../../composables/use-toast'
import EmojiPicker from '../../../components/emoji-picker/emoji-picker.vue'
import type { EmojiStickerItem } from '../../../components/emoji-picker/types'
import Popup from '../../../components/popup/popup.vue'
import { useLocale } from '../../../locale'
import type { UiMessage } from '../../../sdk/types'
import MentionPicker from '../mention/mention-picker.vue'
import QuoteBar from '../quote/quote-bar.vue'
import type { ChatConfig, ChatSendHooks, MentionContact } from '../types'
import H5Input from '../h5-input/h5-input.vue'
import SimpleInput from './simple-input.vue'
import RichInput from './rich-input.vue'
import EditingBar from './editing-bar.vue'

export interface MessageInputProps {
  config?: ChatConfig
  /** 当前是否为群聊 */
  isGroup?: boolean
  /** 键盘高度（H5 适配用） */
  keyboardHeight?: number
  /** @提及联系人列表，传入后优先于 config.input.mention.contacts */
  mentionContacts?: MentionContact[]
  /** 当前群是否全员禁言 */
  muted?: boolean
}

export interface MessageInputEmits {
  (e: 'send-success'): void
  /** 输入框聚焦时触发（H5 键盘弹起后需滚动消息列表） */
  (e: 'focus'): void
}

const props = defineProps<MessageInputProps>()
const emit = defineEmits<MessageInputEmits>()

const { sendTextMessage, sendImageMessage, sendFileMessage, sendAudioMessage, sendVideoMessage, editingMessage, exitEditMode, modifyTextMessage } = useChat()
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
    console.error('[MessageInput] beforeSend hook error:', formatSdkError(e))
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
      console.error('[MessageInput] afterSend hook error:', formatSdkError(e))
    }
  }
}

/** 输入框模式（移动端固定渲染 H5Input，不走 simple/rich 分支） */
const inputMode = computed(() => {
  return inputConfig.value?.mode ?? 'simple'
})

/** Emoji 选择器显示状态 */
const showEmojiPicker = ref(false)

/** 表情包（sticker）配置 */
const stickerPacks = computed(() => inputConfig.value?.stickerPacks ?? [])

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

/** @提及联系人列表：传入的 props 优先，否则取 config */
const mentionContacts = computed(() => props.mentionContacts ?? inputConfig.value?.mention?.contacts ?? [])

/** SimpleInput 引用 */
const simpleInputRef = ref<InstanceType<typeof SimpleInput>>()

/** H5Input 引用（移动端） */
const h5InputRef = ref<InstanceType<typeof H5Input>>()

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
      console.error('[MessageInput] sendTextMessage failed:', formatSdkError(e))
      showToast(resolveSdkErrorMessage(e, 'message.send.failed', t))
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
      console.error('[MessageInput] sendTextMessage failed:', formatSdkError(e))
      showToast(resolveSdkErrorMessage(e, 'message.send.failed', t))
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
    console.error('[MessageInput] sendFile failed:', formatSdkError(e))
    showToast(resolveSdkErrorMessage(e, 'message.send.failed', t))
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
      if (settled)
        return
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

/** 选择 Emoji（移动端面板在 H5Input 内部，不会走到这里） */
function onEmojiSelect(emoji: string) {
  showEmojiPicker.value = false
  if (isMobile.value) {
    h5InputRef.value?.insertEmoji?.(emoji)
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.insertEmoji?.(emoji)
  }
  else {
    richInputRef.value?.insertEmoji?.(emoji)
  }
}

/** 选择表情包（sticker）：SDK 图片消息支持 GIF，按 URL 以图片消息发送 */
async function onStickerSelect(sticker: EmojiStickerItem) {
  showEmojiPicker.value = false
  const canSend = await runBeforeSend({ type: 'image' })
  if (!canSend)
    return
  sendImageMessage(sticker.url, groupReadReceiptConfig.value)
    .then((msg) => {
      emit('send-success')
      runAfterSend(msg)
    })
    .catch((e: any) => {
      console.error('[MessageInput] sendSticker failed:', formatSdkError(e))
      showToast(resolveSdkErrorMessage(e, 'message.send.failed', t))
    })
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
  if (isMobile.value) {
    h5InputRef.value?.insertMention?.(contact)
  }
  else if (inputMode.value === 'simple') {
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
    console.error('录音启动失败:', formatSdkError(err))
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
          console.error('[MessageInput] sendAudioMessage failed:', formatSdkError(e))
          showToast(resolveSdkErrorMessage(e, 'message.send.failed', t))
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
  if (isMobile.value) {
    h5InputRef.value?.setText?.(value)
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.setText?.(value)
  }
  else {
    richInputRef.value?.setText?.(value)
  }
}

/** 获取当前输入文本 */
function getText(): string {
  if (isMobile.value) {
    return h5InputRef.value?.getText?.() || ''
  }
  if (inputMode.value === 'simple') {
    return simpleInputRef.value?.getText?.() || ''
  }
  else {
    return richInputRef.value?.getText?.() || ''
  }
}

/** 聚焦输入框 */
function focus() {
  if (isMobile.value) {
    h5InputRef.value?.$el?.querySelector('textarea')?.focus()
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.$el?.querySelector('textarea')?.focus()
    simpleInputRef.value?.$el?.querySelector('input')?.focus()
  }
  else {
    richInputRef.value?.$el?.querySelector('[contenteditable]')?.focus()
  }
}

/** 向 plugin 提供输入框操作能力 */
provideMessageInputPluginContext({
  setText,
  getText,
  focus,
})

defineExpose({
  setText,
  getText,
})
</script>

<template>
  <div
    ref="messageInputRef"
    class="message-input"
    :class="{ 'message-input--mobile': isMobile }"
    :style="isMobile ? undefined : { paddingBottom: `${props.keyboardHeight || 0}px` }"
  >
    <!-- 全员禁言遮罩 -->
    <div v-if="props.muted" class="message-input__muted-overlay">
      <span class="message-input__muted-text">{{ t('chat.input.mutedAll') || '全员禁言中' }}</span>
    </div>

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

    <!-- 移动端：微信式 H5 输入区（表情/更多面板在其内部展开，键盘高度 padding 也在其内部处理） -->
    <H5Input
      v-if="isMobile"
      ref="h5InputRef"
      :config="inputConfig"
      :enable-mention="enableMention"
      :keyboard-height="props.keyboardHeight"
      @send="handleSendText"
      @send-file="handleSendFile"
      @voice-start="handleVoiceStart"
      @voice-end="handleVoiceEnd"
      @voice-cancel="handleVoiceCancel"
      @mention-trigger="onMentionTrigger"
      @mention-close="onMentionClose"
      @sticker-select="onStickerSelect"
      @focus="emit('focus')"
    >
      <template #toolbar-extra="slotProps">
        <slot name="toolbar-extra" v-bind="slotProps" />
      </template>
      <template #input-panel="slotProps">
        <slot name="input-panel" v-bind="slotProps" />
      </template>
    </H5Input>

    <!-- 简单输入框 -->
    <SimpleInput
      v-else-if="inputMode === 'simple'"
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
      @focus="emit('focus')"
    >
      <template #toolbar-extra="slotProps">
        <slot name="toolbar-extra" v-bind="slotProps" />
      </template>
      <template #input-panel="slotProps">
        <slot name="input-panel" v-bind="slotProps" />
      </template>
    </SimpleInput>

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
    >
      <template #toolbar-extra="slotProps">
        <slot name="toolbar-extra" v-bind="slotProps" />
      </template>
      <template #input-panel="slotProps">
        <slot name="input-panel" v-bind="slotProps" />
      </template>
    </RichInput>

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
          :sticker-packs="stickerPacks"
          @select="onEmojiSelect"
          @select-sticker="onStickerSelect"
          @update:show="showEmojiPicker = $event"
        />
      </div>
    </Popup>

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
}
</style>

<style scoped>
.message-input {
  position: relative;
  background-color: var(--uikit-bg-base);
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: var(--uikit-components-radius, 12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin: 12px;
  padding: 12px;
  transition: border-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-input:focus-within {
  border-color: var(--uikit-primary-color);
}

/* 移动端：去掉桌面卡片样式（margin/border/radius/shadow），改为全宽工具条容器 */
.message-input--mobile {
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.message-input--mobile:focus-within {
  border-color: transparent;
}

.message-input--mobile .message-input__muted-overlay {
  border-radius: 0;
}

/* 全员禁言遮罩 */
.message-input__muted-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 12px);
  opacity: 0.95;
}

.message-input__muted-text {
  font-size: 14px;
  color: var(--uikit-text-secondary);
}
</style>
