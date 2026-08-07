<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import Input from '../../../components/input/input.vue'
import Button from '../../../components/button/button.vue'
import Icon from '../../../components/icon/icon.vue'
import VoicePanel from './components/voice-panel.vue'
import type { ChatConfig, MentionContact } from '../types'

export interface SimpleInputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
}

const props = defineProps<SimpleInputProps>()

const emit = defineEmits<{
  (e: 'send', text: string, mentionList?: MentionContact[]): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'emoji-click', anchor: HTMLElement): void
  (e: 'voice-start'): void
  (e: 'voice-end', duration: number): void
  (e: 'voice-cancel'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
  (e: 'typing'): void
  (e: 'focus'): void
}>()

const { t } = useLocale()
const { isMobile } = useViewport()

/** 输入文本 */
const text = ref('')

/** 输入框风格 */
const style = computed(() => props.config?.style ?? 'wechat')

/** 功能开关 */
const features = computed(() => ({
  emoji: props.config?.features?.emoji !== false,
  image: props.config?.features?.image !== false,
  file: props.config?.features?.file !== false,
  voice: props.config?.features?.voice !== false,
  video: props.config?.features?.video !== false,
}))

/** 是否显示发送按钮 */
const showSendButton = computed(() => props.config?.showSendButton !== false)

/** 是否使用多行文本 */
const isMultiline = computed(() => !isMobile.value)

/** 光标颜色 */
const caretColorVar = computed(() => props.config?.caretColor || 'auto')

/** 文本选中背景色 */
const selectionColorVar = computed(() => props.config?.selectionColor || 'revert')

/** 最大输入长度 */
const maxLengthValue = computed(() => {
  const len = props.config?.maxLength
  return len && len > 0 ? len : undefined
})

/** 移动端是否正在录音（保持原有行为） */
const isMobileRecording = ref(false)

/** 是否处于录音模式（PC 端点击麦克风后进入） */
const isVoiceMode = ref(false)

/** 已插入的 @提及列表 */
const mentionList = ref<MentionContact[]>([])

/** 发送消息 */
function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed) {
    return
  }
  // 过滤出实际出现在文本中的 mention
  const activeMentions = mentionList.value.filter(m => trimmed.includes(`@${m.name}`))
  emit('send', trimmed, activeMentions.length > 0 ? activeMentions : undefined)
  text.value = ''
  mentionList.value = []
}

/** 输入状态提示节流 */
let typingThrottleTimer: ReturnType<typeof setTimeout> | null = null
let isTypingThrottled = false

/** 触发输入状态 */
function triggerTyping() {
  if (isTypingThrottled) {
    return
  }
  isTypingThrottled = true
  emit('typing')
  typingThrottleTimer = setTimeout(() => {
    isTypingThrottled = false
    typingThrottleTimer = null
  }, 5000)
}

/** 输入事件处理 */
function onInput() {
  detectMention()
  triggerTyping()
}

/** 键盘事件 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

/** 触发文件选择 */
const imageInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()

function triggerFileInput(type: 'image' | 'file' | 'video') {
  const ref = type === 'image' ? imageInputRef : type === 'video' ? videoInputRef : fileInputRef
  ref.value?.click()
}

function onFileSelected(type: 'image' | 'file' | 'video', event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length > 0) {
    emit('send-file', type, files)
    ;(event.target as HTMLInputElement).value = ''
  }
}

/** 移动端语音录制（保持原有点击切换行为） */
function toggleMobileVoice() {
  if (isMobileRecording.value) {
    isMobileRecording.value = false
    emit('voice-end', 0)
  } else {
    isMobileRecording.value = true
    emit('voice-start')
  }
}

/** 统一的麦克风按钮点击处理 */
function onMicClick() {
  if (isMobile.value) {
    toggleMobileVoice()
  } else {
    isVoiceMode.value = true
  }
}

/** 麦克风图标高亮状态 */
const showMicOn = computed(() => {
  if (isMobile.value) return isMobileRecording.value
  return isVoiceMode.value
})

/** 表情按钮 ref */
const emojiBtnRef = ref<HTMLElement>()

/** @按钮 ref（作为提及面板锚点） */
const mentionBtnRef = ref<HTMLElement>()

/** 点击 @按钮：末尾插入 '@' 并打开提及面板（选择联系人后 insertMention 可定位替换） */
function onMentionBtnClick() {
  if (!props.enableMention)
    return
  const el = getInputEl()
  text.value = `${text.value}@`
  nextTick(() => {
    el?.focus()
    const pos = text.value.length
    el?.setSelectionRange(pos, pos)
  })
  if (mentionBtnRef.value)
    emit('mention-trigger', mentionBtnRef.value, '')
}

/** 是否展开自定义面板（由 #input-panel 插槽使用） */
const showPanel = ref(false)

/** 切换自定义面板 */
function togglePanel() {
  showPanel.value = !showPanel.value
}

/** 关闭自定义面板 */
function closePanel() {
  showPanel.value = false
}

/** 输入框元素引用（textarea 或 Input 组件实例） */
const textareaRef = ref<HTMLTextAreaElement>()
const inputComponentRef = ref<InstanceType<typeof Input>>()

/** 获取底层 input/textarea 元素 */
function getInputEl(): HTMLInputElement | HTMLTextAreaElement | undefined {
  return textareaRef.value || inputComponentRef.value?.inputRef || undefined
}

/** 获取 textarea/input 光标像素坐标 */
function getCaretCoordinates(el: HTMLInputElement | HTMLTextAreaElement, position: number) {
  const div = document.createElement('div')
  const style = getComputedStyle(el)
  const elRect = el.getBoundingClientRect()
  const props = ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'whiteSpace', 'wordWrap', 'width']
  props.forEach((p) => {
    div.style.setProperty(p, style.getPropertyValue(p))
  })
  // 将镜像 div 定位到输入框的视口位置，确保坐标计算正确
  div.style.position = 'fixed'
  div.style.left = `${elRect.left}px`
  div.style.top = `${elRect.top}px`
  div.style.visibility = 'hidden'
  div.style.height = 'auto'
  div.style.zIndex = '-9999'
  div.style.pointerEvents = 'none'
  div.textContent = el.value.substring(0, position)
  const span = document.createElement('span')
  span.textContent = el.value.substring(position) || '\u200b'
  div.appendChild(span)
  document.body.appendChild(div)
  const rect = span.getBoundingClientRect()
  document.body.removeChild(div)
  return { left: rect.left, top: rect.top + rect.height }
}

/** 检测是否触发了 @提及 */
function detectMention() {
  if (!props.enableMention) {
    return
  }
  const el = getInputEl()
  if (!el) {
    return
  }
  const pos = el.selectionStart || 0
  const value = el.value

  // 从光标位置往前找 @ 符号
  let atPos = -1
  for (let i = pos - 1; i >= 0; i--) {
    if (value[i] === '@') {
      atPos = i
      break
    }
    // 遇到空格/换行说明前面没有 @ 了
    if (value[i] === ' ' || value[i] === '\n') {
      break
    }
  }

  // 没找到 @，关闭提及弹窗
  if (atPos === -1) {
    emit('mention-close')
    return
  }

  const keyword = value.substring(atPos + 1, pos)

  // 计算光标坐标并创建锚点
  const coords = getCaretCoordinates(el, pos)
  const anchor = document.createElement('div')
  anchor.style.position = 'fixed'
  anchor.style.left = `${coords.left}px`
  anchor.style.top = `${coords.top}px`
  anchor.style.width = '1px'
  anchor.style.height = '1px'
  anchor.style.pointerEvents = 'none'
  document.body.appendChild(anchor)

  emit('mention-trigger', anchor, keyword)
}

/** 在光标位置插入 @提及文本（替换已有的 @keyword） */
function insertMention(contact: MentionContact) {
  const el = getInputEl()
  if (!el) {
    return
  }

  const pos = el.selectionStart || 0
  const value = el.value

  // 往前找到 @ 的位置
  let atPos = pos - 1
  while (atPos >= 0 && value[atPos] !== '@') {
    atPos--
  }
  if (atPos < 0) {
    return
  }

  const before = value.substring(0, atPos)
  const after = value.substring(pos)
  text.value = `${before}@${contact.name} ${after}`

  // 记录 mention
  if (!mentionList.value.find(m => m.userId === contact.userId)) {
    mentionList.value.push(contact)
  }

  // 恢复光标位置
  nextTick(() => {
    const newPos = before.length + contact.name.length + 2 // @name + 空格
    el.setSelectionRange(newPos, newPos)
    el.focus()
  })
}

/** 在末尾追加 @提及 */
function appendMention(contact: MentionContact) {
  const el = getInputEl()
  if (!el)
    return
  const prefix = text.value.length > 0 && !text.value.endsWith(' ') ? ' ' : ''
  text.value = `${text.value}${prefix}@${contact.name} `
  if (!mentionList.value.find(m => m.userId === contact.userId)) {
    mentionList.value.push(contact)
  }
  nextTick(() => {
    el.focus()
    const newPos = text.value.length
    el.setSelectionRange(newPos, newPos)
  })
}

/** 点击表情按钮 */
function onEmojiClick() {
  if (emojiBtnRef.value) {
    emit('emoji-click', emojiBtnRef.value)
  }
}

/** 在光标位置插入 Emoji */
function insertEmoji(emoji: string) {
  const el = getInputEl()
  if (!el) {
    return
  }

  const start = el.selectionStart || 0
  const end = el.selectionEnd || 0
  const value = el.value

  text.value = value.substring(0, start) + emoji + value.substring(end)

  nextTick(() => {
    const newPos = start + emoji.length
    el.setSelectionRange(newPos, newPos)
    el.focus()
  })
}

/** 自动聚焦 */
onMounted(() => {
  if (props.config?.autoFocus) {
    const el = getInputEl()
    el?.focus()
  }
})

/** 组件卸载时退出录音模式 */
onBeforeUnmount(() => {
  isVoiceMode.value = false
})

/** 设置输入文本 */
function setText(value: string) {
  text.value = value
  mentionList.value = []
  nextTick(() => {
    const el = getInputEl()
    el?.focus()
  })
}

/** 获取当前输入文本 */
function getText(): string {
  return text.value
}

/** 暴露方法 */
defineExpose({
  insertMention,
  appendMention,
  insertEmoji,
  setText,
  getText,
})
</script>

<template>
  <div
    class="simple-input"
    :class="{
      'simple-input--feishu': style === 'feishu',
      'simple-input--wechat': style === 'wechat',
    }"
  >
    <!-- 工具栏 -->
    <div class="simple-input__toolbar">
      <div v-if="features.emoji" ref="emojiBtnRef" class="simple-input__tool-btn" @click="onEmojiClick">
        <Icon name="emojis-reactions/face" :size="22" />
      </div>
      <div v-if="features.image" class="simple-input__tool-btn" @click="triggerFileInput('image')">
        <Icon name="files-media/img" :size="22" />
      </div>
      <div v-if="features.video" class="simple-input__tool-btn" @click="triggerFileInput('video')">
        <Icon name="misc/triangle_in_rect" :size="22" />
      </div>
      <div v-if="features.file" class="simple-input__tool-btn" @click="triggerFileInput('file')">
        <Icon name="files-media/file" :size="22" />
      </div>
      <div v-if="features.voice" class="simple-input__tool-btn" @click="onMicClick">
        <Icon :name="showMicOn ? 'audio-video/mic_on' : 'audio-video/mic'" :size="22" />
      </div>
      <div v-if="props.enableMention" ref="mentionBtnRef" class="simple-input__tool-btn" title="@" @click="onMentionBtnClick">
        <Icon name="misc/at" :size="22" />
      </div>
      <slot name="toolbar-extra" :toggle-panel="togglePanel" :show-panel="showPanel" :close-panel="closePanel" />
    </div>

    <!-- 输入区域 -->
    <div class="simple-input__field-area">
      <!-- 正常输入（PC 端非录音模式，或移动端非录音模式） -->
      <template v-if="!isVoiceMode && !isMobileRecording">
        <Input
          v-if="!isMultiline"
          ref="inputComponentRef"
          v-model="text"
          :placeholder="t('chat.placeholder')"
          :maxlength="maxLengthValue"
          class="simple-input__field"
          @submit="handleSend"
          @input="onInput"
          @focus="emit('focus')"
        />
        <textarea
          v-else
          ref="textareaRef"
          v-model="text"
          class="simple-input__textarea"
          :placeholder="t('chat.placeholder')"
          :maxlength="maxLengthValue"
          rows="3"
          @keydown="onKeydown"
          @input="onInput"
          @focus="emit('focus')"
        />
      </template>

      <!-- PC 端录音面板 -->
      <template v-else-if="isVoiceMode && !isMobile">
        <VoicePanel
          :active="isVoiceMode"
          @update:active="isVoiceMode = $event"
          @start="emit('voice-start')"
          @end="(d) => emit('voice-end', d)"
          @cancel="emit('voice-cancel')"
        />
      </template>

      <!-- 移动端语音录制按钮 -->
      <div v-else-if="isMobileRecording" class="simple-input__voice-btn-mobile">
        {{ t('chat.voice.releaseEnd') }}
      </div>
    </div>

    <!-- 自定义面板：由 #input-panel 插槽填充 -->
    <div v-if="showPanel" class="simple-input__panel">
      <slot name="input-panel" :show-panel="showPanel" :close-panel="closePanel" />
    </div>

    <!-- 发送按钮 -->
    <div v-if="showSendButton" class="simple-input__actions">
      <Button
        type="primary"
        size="small"
        :disabled="!text.trim()"
        @click="handleSend"
      >
        {{ t('chat.send') }}
      </Button>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileSelected('image', $event)"
    />
    <input
      ref="videoInputRef"
      type="file"
      accept="video/*"
      style="display: none"
      @change="onFileSelected('video', $event)"
    />
    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="onFileSelected('file', $event)"
    />
  </div>
</template>

<style scoped>
.simple-input {
  display: flex;
  flex-direction: column;
  gap: var(--uikit-container-gap, 8px);
  background-color: transparent;
}

/* 飞书风格：输入框在上，工具栏在下 */
.simple-input--feishu {
  flex-direction: column-reverse;
}

/* 微信风格：工具栏在上，输入框在下 */
.simple-input--wechat {
  flex-direction: column;
}

.simple-input__toolbar {
  display: flex;
  align-items: center;
  gap: calc(var(--uikit-container-gap, 8px) * 1.5);
}

.simple-input__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  cursor: pointer;
  color: var(--uikit-text-secondary);
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    color var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

@media (hover: hover) {
.simple-input__tool-btn:hover {
  background-color: var(--uikit-bg-hover);
  color: var(--uikit-text-primary);
}
}

.simple-input__field-area {
  display: flex;
  align-items: flex-end;
  gap: var(--uikit-container-gap, 8px);
}

.simple-input__field {
  flex: 1;
}

.simple-input__textarea {
  flex: 1;
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  font-size: var(--uikit-font-size-14);
  outline: none;
  background-color: transparent;
  color: var(--uikit-text-primary);
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

.simple-input__textarea::placeholder {
  color: var(--uikit-text-secondary);
}

.simple-input__textarea {
  caret-color: v-bind(caretColorVar);
}

.simple-input__textarea::selection {
  background-color: v-bind(selectionColorVar);
}

/* 覆盖 Input 组件的样式：融入 card 容器，去掉内边框 */
:deep(.uikit-input__field) {
  caret-color: v-bind(caretColorVar);
  border: none;
  background-color: transparent;
}

:deep(.uikit-input__field:focus) {
  border-color: transparent;
}

:deep(.uikit-input__field::selection) {
  background-color: v-bind(selectionColorVar);
}

.simple-input__voice-btn-mobile {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-border-color);
  text-align: center;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  cursor: pointer;
  user-select: none;
}

.simple-input__voice-btn-mobile:active {
  background-color: var(--uikit-bg-hover);
}

.simple-input__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 4px 4px 0;
}

.simple-input__panel {
  border-top: 1px solid var(--uikit-border-color);
  padding-top: 8px;
}
</style>
