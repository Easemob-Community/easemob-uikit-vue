<script setup lang="ts">
/**
 * 聊天室输入条（H5-first）：文本 + 表情 + 图片，无 tiptap（聊天室输入条从简，
 * 见设计文档 §5.8——首屏 bundle 不引入编辑器，先做「文本+表情+图片+语音转文字」）。
 * 发送流程：乐观上屏（消息先入列表 sending 态）→ 失败由消息层 toast + failed 标记，
 * 触发 SDK 发送侧限流时输入框不清空文本由容器按需回填（此处发送即清空，限流反馈
 * 在消息列表可见）。
 */
import { ref } from 'vue'
import { EmEmojiPicker, EmIconButton, EmPopup, t } from '@easemob/uikit-core'

export interface ChatroomInputBarProps {
  /** 是否禁用输入（未进房 / 全员禁言非管理员 / 自己被禁言） */
  disabled?: boolean
  /** 占位文案，缺省用 locale（chatroom.ui.inputPlaceholder） */
  placeholder?: string
}

export interface ChatroomInputBarEmits {
  /** 发送文本消息（调用方负责经 useChatroomMessage.sendText 发送） */
  (e: 'send', text: string): void
  /** 选择图片文件（调用方负责经 useChatroomMessage.sendImage 发送） */
  (e: 'send-image', file: File): void
}

const props = withDefaults(defineProps<ChatroomInputBarProps>(), {
  disabled: false,
  placeholder: '',
})

const emit = defineEmits<ChatroomInputBarEmits>()

const text = ref('')
const sending = ref(false)
const fileInput = ref<HTMLInputElement>()
const textInput = ref<HTMLInputElement>()
/** 表情面板显隐（H5 底部弹层，可连续选择不自动关闭） */
const showEmojiPicker = ref(false)

/** 发送（空文本忽略；发送期间防连点） */
async function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled || sending.value)
    return
  sending.value = true
  try {
    text.value = ''
    emit('send', content)
  }
  finally {
    sending.value = false
  }
}

/** 唤起图片选择（file input 复用） */
function pickImage() {
  if (props.disabled)
    return
  fileInput.value?.click()
}

/** 选中图片后立即发送并重置 input（可连续选择不同图片） */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file)
    emit('send-image', file)
  input.value = ''
}

/** 选择 emoji：插入输入框光标处（无选区时追加到末尾），保持面板打开可连续选择 */
function handleEmojiSelect(emoji: string) {
  const el = textInput.value
  if (!el) {
    text.value += emoji
    return
  }
  const start = el.selectionStart ?? text.value.length
  const end = el.selectionEnd ?? start
  text.value = text.value.slice(0, start) + emoji + text.value.slice(end)
  // 光标移到插入内容之后并聚焦（不主动唤起 H5 键盘，避免遮挡表情面板）
  const caret = start + emoji.length
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

/** 回车发送（移动端软键盘确认键）；Shift+Enter 换行由 textarea 自带，此处仅 input 单行场景 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void handleSend()
  }
}
</script>

<template>
  <div class="chatroom-input-bar" :class="{ 'chatroom-input-bar--disabled': disabled }">
    <input
      ref="textInput"
      v-model="text"
      class="chatroom-input-bar__field"
      type="text"
      :placeholder="placeholder || t('chatroom.ui.inputPlaceholder')"
      :disabled="disabled"
      enterkeyhint="send"
      @keydown="handleKeydown"
    >
    <EmIconButton
      class="chatroom-input-bar__emoji"
      icon="emojis-reactions/face"
      :disabled="disabled"
      :title="t('chatroom.ui.emoji')"
      @click="showEmojiPicker = !showEmojiPicker"
    />
    <EmIconButton
      class="chatroom-input-bar__image"
      icon="files-media/img"
      :disabled="disabled"
      :title="t('chatroom.ui.image')"
      @click="pickImage"
    />
    <button
      class="chatroom-input-bar__send"
      :disabled="disabled || !text.trim() || sending"
      @click="handleSend"
    >
      {{ t('chatroom.ui.send') }}
    </button>
    <input
      ref="fileInput"
      class="chatroom-input-bar__file"
      type="file"
      accept="image/*"
      @change="handleFileChange"
    >

    <!-- 表情面板（H5 底部弹层；选中插入不自动关闭，可连续选择） -->
    <EmPopup
      v-model:show="showEmojiPicker"
      position="bottom"
      class="chatroom-input-bar__emoji-popup"
    >
      <EmEmojiPicker :show="true" @select="handleEmojiSelect" />
    </EmPopup>
  </div>
</template>

<style scoped>
.chatroom-input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--uikit-bg-panel, var(--uikit-bg-base));
  border-top: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

.chatroom-input-bar--disabled {
  opacity: 0.6;
}

.chatroom-input-bar__field {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--uikit-radius-md, 8px);
  background: var(--uikit-bg-input, var(--uikit-bg-secondary));
  color: var(--uikit-text-primary);
  font-size: 14px;
  outline: none;
}

.chatroom-input-bar__field:focus {
  border-color: var(--uikit-primary-color);
}

.chatroom-input-bar__field:disabled {
  cursor: not-allowed;
}

.chatroom-input-bar__emoji,
.chatroom-input-bar__image {
  flex-shrink: 0;
}

.chatroom-input-bar__send {
  flex-shrink: 0;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: var(--uikit-radius-md, 8px);
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 14px;
  cursor: pointer;
}

.chatroom-input-bar__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chatroom-input-bar__file {
  display: none;
}

.chatroom-input-bar__emoji-popup {
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}
</style>
