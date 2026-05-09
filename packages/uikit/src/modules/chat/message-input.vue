<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useChat } from '../../composables/use-chat'
import { useViewport } from '../../composables/use-viewport'
import { MESSAGE_TYPE } from '../../constants'
import { useToast } from '../../composables/use-toast'
import SimpleInput from './message-input/simple-input.vue'
import RichInput from './message-input/rich-input.vue'
import EmojiPicker from '../../components/emoji-picker/emoji-picker.vue'
import MentionPicker from './mention-picker.vue'
import Popup from '../../components/popup/popup.vue'
import type { ChatConfig, MentionContact } from './types'

export interface MessageInputProps {
  config?: ChatConfig
  /** 当前是否为群聊 */
  isGroup?: boolean
}

const props = defineProps<MessageInputProps>()

const { sendMessage } = useChat()
const { isMobile } = useViewport()
const { show: showToast } = useToast()

/** 输入框配置 */
const inputConfig = computed(() => props.config?.input)

/** 输入框模式 */
const inputMode = computed(() => {
  // H5 端强制降级为 simple 模式
  if (isMobile.value) return 'simple'
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
  if (cfg?.features?.mention === false) return false
  const onlyInGroup = cfg?.mention?.onlyInGroup ?? true
  if (onlyInGroup && !props.isGroup) return false
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

/** 发送文本消息 */
function handleSendText(text: string) {
  sendMessage({ msg: text }, MESSAGE_TYPE.TXT)
}

/** 发送富文本消息 */
function handleSendRich(_html: string, text: string) {
  sendMessage({ msg: text }, MESSAGE_TYPE.TXT)
}

/** 待回收的 Blob URL 列表 */
const pendingBlobUrls = new Set<string>()

/** 发送文件消息 */
function handleSendFile(type: 'image' | 'file' | 'video', files: FileList) {
  const file = files[0]
  if (!file) return

  const url = URL.createObjectURL(file)
  // 记录 blob URL 以便后续回收
  pendingBlobUrls.add(url)
  const msgType = type === 'image'
    ? MESSAGE_TYPE.IMG
    : type === 'video'
      ? MESSAGE_TYPE.VIDEO
      : MESSAGE_TYPE.FILE

  sendMessage(
    {
      url,
      name: file.name,
      size: file.size,
    },
    msgType
  )
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
  } else {
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
    simpleInputRef.value?.insertMention?.(name)
  } else {
    richInputRef.value?.insertMention?.(name)
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
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.start()
    recordingStartTime = Date.now()

    // 如果启动期间被要求停止，立即取消
    if (shouldCancelVoice) {
      handleVoiceCancel()
    }
  } catch (err) {
    console.error('录音启动失败:', err)
    showToast('录音启动失败，请检查麦克风权限')
    // 清理
    voiceStream?.getTracks().forEach((track) => track.stop())
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

  const actualDuration =
    durationFromInput ?? Math.floor((Date.now() - recordingStartTime) / 1000)

  const mr = mediaRecorder

  // 如果还没开始录音（state 为 inactive），直接清理资源
  if (mr.state === 'inactive') {
    voiceStream?.getTracks().forEach((track) => track.stop())
    audioChunks = []
    voiceStream = null
    mediaRecorder = null
    return
  }

  mediaRecorder.onstop = () => {
    voiceStream?.getTracks().forEach((track) => track.stop())

    if (!isVoiceCancelled && audioChunks.length > 0) {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      pendingBlobUrls.add(url)

      sendMessage(
        {
          url,
          duration: actualDuration,
          filename: `voice-${Date.now()}.webm`,
          filetype: 'audio/webm',
          size: blob.size,
        },
        MESSAGE_TYPE.AUDIO
      )
    }

    audioChunks = []
    voiceStream = null
    if (mr === mediaRecorder) mediaRecorder = null
  }

  mr.stop()
}

/** 取消录音 */
function handleVoiceCancel() {
  isVoiceCancelled = true
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  voiceStream?.getTracks().forEach((track) => track.stop())
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
</script>

<template>
  <div ref="messageInputRef" class="message-input">
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
      <div class="message-input__emoji-sheet-content">
        <div class="emoji-picker-wrapper">
          <EmojiPicker
            :show="true"
            @select="onEmojiSelect"
            @update:show="showEmojiPicker = $event"
          />
        </div>
      </div>
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
  border-radius: 12px;
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
  border-radius: 16px 16px 0 0;
  padding: 12px;
  animation: slide-up 0.2s ease-out;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
