<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import Input from '../../../components/input/input.vue'
import Button from '../../../components/button/button.vue'
import Icon from '../../../components/icon/icon.vue'
import type { ChatConfig } from '../types'

export interface SimpleInputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
}

const props = defineProps<SimpleInputProps>()

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'emoji-click'): void
  (e: 'voice-start'): void
  (e: 'voice-end'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
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
  video: props.config?.features?.video ?? false,
}))

/** 是否使用多行文本 */
const isMultiline = computed(() => !isMobile.value)

/** 是否正在录音 */
const isRecording = ref(false)

/** 发送消息 */
function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed) return
  emit('send', trimmed)
  text.value = ''
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

/** 语音录制 */
function toggleVoice() {
  if (isRecording.value) {
    isRecording.value = false
    emit('voice-end')
  } else {
    isRecording.value = true
    emit('voice-start')
  }
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
  if (!props.enableMention) return
  const el = getInputEl()
  if (!el) return
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

  // 检查 @ 前面是否是边界（开头、空格、换行）
  const isBoundary = atPos === 0 || value[atPos - 1] === ' ' || value[atPos - 1] === '\n'
  if (!isBoundary) {
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
function insertMention(name: string) {
  const el = getInputEl()
  if (!el) return

  const pos = el.selectionStart || 0
  const value = el.value

  // 往前找到 @ 的位置
  let atPos = pos - 1
  while (atPos >= 0 && value[atPos] !== '@') {
    atPos--
  }
  if (atPos < 0) return

  const before = value.substring(0, atPos)
  const after = value.substring(pos)
  text.value = `${before}@${name} ${after}`

  // 恢复光标位置
  nextTick(() => {
    const newPos = before.length + name.length + 2 // @name + 空格
    el.setSelectionRange(newPos, newPos)
    el.focus()
  })
}

/** 暴露方法 */
defineExpose({
  insertMention,
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
      <div v-if="features.emoji" class="simple-input__tool-btn" @click="emit('emoji-click')">
        <Icon name="emojis-reactions/face" :size="22" />
      </div>
      <div v-if="features.image" class="simple-input__tool-btn" @click="triggerFileInput('image')">
        <Icon name="files-media/img" :size="22" />
      </div>
      <div v-if="features.video" class="simple-input__tool-btn" @click="triggerFileInput('video')">
        <Icon name="audio-video/video_camera" :size="22" />
      </div>
      <div v-if="features.file" class="simple-input__tool-btn" @click="triggerFileInput('file')">
        <Icon name="files-media/file" :size="22" />
      </div>
      <div v-if="features.voice" class="simple-input__tool-btn" @click="toggleVoice">
        <Icon :name="isRecording ? 'audio-video/mic_on' : 'audio-video/mic'" :size="22" />
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="simple-input__field-area">
      <!-- 单行/多行输入 -->
      <template v-if="!isRecording">
        <Input
          v-if="!isMultiline"
          ref="inputComponentRef"
          v-model="text"
          :placeholder="t('chat.placeholder')"
          class="simple-input__field"
          @submit="handleSend"
          @input="detectMention"
        />
        <textarea
          v-else
          ref="textareaRef"
          v-model="text"
          class="simple-input__textarea"
          :placeholder="t('chat.placeholder')"
          rows="3"
          @keydown="onKeydown"
          @input="detectMention"
        />
      </template>

      <!-- 语音录制按钮 -->
      <div v-else class="simple-input__voice-btn">
        {{ isRecording ? '松开结束录音' : '按住说话' }}
      </div>
    </div>

    <!-- 发送按钮 -->
    <div class="simple-input__actions">
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
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--uikit-bg-secondary);
  border-top: 1px solid #e5e7eb;
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
  gap: 12px;
}

.simple-input__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--uikit-text-secondary);
  transition: background-color 0.15s, color 0.15s;
  flex-shrink: 0;
}

.simple-input__tool-btn:hover {
  background-color: var(--uikit-bg-hover, #e5e7eb);
  color: var(--uikit-text-primary);
}

.simple-input__field-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.simple-input__field {
  flex: 1;
}

.simple-input__textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background-color: var(--uikit-bg-base);
  color: var(--uikit-text-primary);
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.2s;
}

.simple-input__textarea:focus {
  border-color: var(--uikit-primary-color);
}

.simple-input__textarea::placeholder {
  color: var(--uikit-text-secondary);
}

.simple-input__voice-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  background-color: var(--uikit-bg-base);
  border: 1px solid #e5e7eb;
  text-align: center;
  font-size: 14px;
  color: var(--uikit-text-primary);
  cursor: pointer;
  user-select: none;
}

.simple-input__voice-btn:active {
  background-color: var(--uikit-bg-hover, #e5e7eb);
}

.simple-input__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
