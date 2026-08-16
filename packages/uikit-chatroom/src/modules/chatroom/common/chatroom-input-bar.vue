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
import { getChatroomPopupTarget } from '../../../config/popup-target'
import type { ChatroomPopupModeResolvedValue } from '../../../composables/use-chatroom-popup-mode'

export interface ChatroomInputBarProps {
  /** 是否禁用输入（未进房 / 全员禁言非管理员且不在白名单 / 自己被禁言） */
  disabled?: boolean
  /** 禁用原因提示（禁用时显示在输入条下方小字，P2 review P2-8） */
  disabledHint?: string
  /** 占位文案，缺省用 locale（chatroom.ui.inputPlaceholder） */
  placeholder?: string
  /** 多行输入形态（P5 PC 模式：textarea + Shift+Enter 换行 + Enter 发送；H5 单行 input 不变） */
  multiline?: boolean
  /** 表情面板弹层形态（P5 PC 模式：sheet 底部弹层 / dialog 居中弹窗；容器按场景 popupMode 解析传入） */
  popupMode?: ChatroomPopupModeResolvedValue
}

export interface ChatroomInputBarEmits {
  /** 发送文本消息（调用方负责经 useChatroomMessage.sendText 发送） */
  (e: 'send', text: string): void
  /** 选择图片文件（调用方负责经 useChatroomMessage.sendImage 发送） */
  (e: 'send-image', file: File): void
}

const props = withDefaults(defineProps<ChatroomInputBarProps>(), {
  disabled: false,
  disabledHint: '',
  placeholder: '',
  multiline: false,
  popupMode: 'sheet',
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
  // 仅当输入框已有焦点时恢复光标位置（focus() 会唤起移动端软键盘遮挡表情面板，
  // P2 review P2-7）；未聚焦时值已更新，下次聚焦光标在末尾
  const caret = start + emoji.length
  if (document.activeElement === el)
    el.setSelectionRange(caret, caret)
}

/** 设置输入框文本（容器在发送失败后回填，P2 review P1-6） */
function setText(value: string) {
  text.value = value
}

defineExpose({ setText })

/** 回车发送（移动端软键盘确认键）；Shift+Enter 换行由 textarea 自带，此处仅 input 单行场景 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void handleSend()
  }
}

/** 多行输入自适应高度（内容增长撑高，上限 96px 内滚动；清空恢复单行） */
function handleMultilineInput() {
  const el = textInput.value as HTMLTextAreaElement | undefined
  if (!el)
    return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 96)}px`
}
</script>

<template>
  <div class="chatroom-input-bar" :class="{ 'chatroom-input-bar--disabled': disabled }">
    <!-- 多行（PC）：textarea + Shift+Enter 换行；单行（H5）：input -->
    <textarea
      v-if="multiline"
      ref="textInput"
      v-model="text"
      class="chatroom-input-bar__field chatroom-input-bar__field--multiline"
      :placeholder="placeholder || t('chatroom.ui.inputPlaceholder')"
      :disabled="disabled"
      rows="1"
      @keydown="handleKeydown"
      @input="handleMultilineInput"
    />
    <input
      v-else
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

    <!-- 禁用原因提示（全员禁言/被禁言等，P2 review P2-8） -->
    <div v-if="disabled && disabledHint" class="chatroom-input-bar__hint">
      {{ disabledHint }}
    </div>

    <!-- 表情面板（sheet：H5 底部弹层；dialog：PC 居中弹窗；选中插入不自动关闭，可连续选择） -->
    <EmPopup
      v-model:show="showEmojiPicker"
      :to="getChatroomPopupTarget() ?? undefined"
      :position="popupMode === 'dialog' ? 'center' : 'bottom'"
      class="chatroom-input-bar__emoji-popup"
      :class="{ 'chatroom-input-bar__emoji-popup--dialog': popupMode === 'dialog' }"
    >
      <EmEmojiPicker :show="true" @select="handleEmojiSelect" />
    </EmPopup>
  </div>
</template>

<style scoped>
.chatroom-input-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  /* 底部安全区：iPhone 横条遮挡适配（H5-first，P4 UI 适配） */
  padding: 8px 12px calc(8px + var(--uikit-safe-bottom, 0px));
  background: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-top: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

.chatroom-input-bar--disabled {
  opacity: 0.6;
}

.chatroom-input-bar__hint {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(100% + 4px);
  font-size: 12px;
  color: var(--uikit-text-secondary);
  text-align: center;
  pointer-events: none;
}

.chatroom-input-bar__field {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-input-bg, var(--uikit-bg-secondary));
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

/* 多行形态（PC）：textarea 自适应高度，上限 96px 内滚动 */
.chatroom-input-bar__field--multiline {
  height: 38px;
  min-height: 38px;
  padding: 8px 12px;
  line-height: 20px;
  resize: none;
  overflow-y: auto;
  display: block;
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
  border-radius: var(--uikit-components-radius, 8px);
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

.chatroom-input-bar__emoji-popup--dialog {
  border-radius: 12px;
}
</style>
