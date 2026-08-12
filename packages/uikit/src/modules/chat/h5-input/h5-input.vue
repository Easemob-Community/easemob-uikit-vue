<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '../../../locale'
import { filterActiveMentions } from '../../../utils/mention'
import Button from '../../../components/button/button.vue'
import Icon from '../../../components/icon/icon.vue'
import EmojiPicker from '../../../components/emoji-picker/emoji-picker.vue'
import type { EmojiStickerItem } from '../../../components/emoji-picker/types'
import type { ChatConfig, MentionContact } from '../types'

export interface H5InputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
  /** 当前软键盘高度（px），面板高度据此与键盘对齐 */
  keyboardHeight?: number
}

const props = withDefaults(defineProps<H5InputProps>(), {
  keyboardHeight: 0,
})

const emit = defineEmits<{
  (e: 'send', text: string, mentionList?: MentionContact[]): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'voice-start'): void
  (e: 'voice-end', duration: number): void
  (e: 'voice-cancel'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
  (e: 'sticker-select', sticker: EmojiStickerItem): void
  (e: 'typing'): void
  (e: 'focus'): void
}>()

const { t } = useLocale()

/** 输入文本 */
const text = ref('')

/** 表情包（sticker）配置 */
const stickerPacks = computed(() => props.config?.stickerPacks ?? [])

/** 功能开关 */
const features = computed(() => ({
  emoji: props.config?.features?.emoji !== false,
  image: props.config?.features?.image !== false,
  file: props.config?.features?.file !== false,
  voice: props.config?.features?.voice !== false,
  video: props.config?.features?.video !== false,
}))

/** 最大输入长度 */
const maxLengthValue = computed(() => {
  const len = props.config?.maxLength
  return len && len > 0 ? len : undefined
})

/** 光标颜色 */
const caretColorVar = computed(() => props.config?.caretColor || 'auto')

/** 文本选中背景色：未配置时使用主题选中色 token，跟随主题色 */
const selectionColorVar = computed(() => props.config?.selectionColor || 'var(--uikit-selection-bg)')

// ===== 面板（表情 / 更多）=====

type PanelType = 'none' | 'emoji' | 'more' | 'custom'

/** 当前展开的面板 */
const activePanel = ref<PanelType>('none')

/** 切换自定义面板（由 #input-panel 插槽使用） */
function toggleCustomPanel() {
  activePanel.value = activePanel.value === 'custom' ? 'none' : 'custom'
}

/** 关闭自定义面板 */
function closeCustomPanel() {
  if (activePanel.value === 'custom')
    activePanel.value = 'none'
}

/** 键盘是否弹起（键盘高度由父级从 useUIKit().h5 透传） */
const isKeyboardOpen = computed(() => (props.keyboardHeight ?? 0) > 0)

/** 面板高度：与键盘高度对齐，键盘未弹起时兜底 280px */
const panelHeightVar = computed(() => `${Math.max(props.keyboardHeight ?? 0, 280)}px`)

/**
 * 根容器底部 padding：
 * - 键盘弹起：padding = 键盘高度（safe-bottom 由键盘区域覆盖，不再叠加）
 * - 面板展开：不加（面板自身 padding-bottom 含 safe-bottom）
 * - 默认：贴安全区
 */
const rootStyle = computed(() => {
  if (isKeyboardOpen.value)
    return { paddingBottom: `${props.keyboardHeight}px` }
  if (activePanel.value !== 'none')
    return { paddingBottom: '0px' }
  return { paddingBottom: 'var(--uikit-safe-bottom, 0px)' }
})

/** 输入框引用 */
const textareaRef = ref<HTMLTextAreaElement>()

/** 切换面板；与键盘互斥：开面板前先 blur textarea */
function togglePanel(panel: PanelType) {
  if (activePanel.value === panel) {
    activePanel.value = 'none'
    return
  }
  textareaRef.value?.blur()
  activePanel.value = panel
  // 面板展开时也 emit 一次 focus：供上层把消息列表滚动到底部（语义同键盘弹起）
  emit('focus')
}

/** textarea 聚焦：关闭面板并通知上层 */
function onTextareaFocus() {
  activePanel.value = 'none'
  emit('focus')
}

/** 键盘弹起时收起面板（兜底，正常情况下开面板前已 blur） */
watch(isKeyboardOpen, (open) => {
  if (open)
    activePanel.value = 'none'
})

// ===== 输入与发送 =====

/** 已插入的 @提及列表 */
const mentionList = ref<MentionContact[]>([])

/** 发送消息 */
function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed)
    return
  // 过滤出实际出现在文本中的 mention（精确匹配，防止删除后残留/前缀误判）
  const activeMentions = filterActiveMentions(trimmed, mentionList.value)
  emit('send', trimmed, activeMentions.length > 0 ? activeMentions : undefined)
  text.value = ''
  mentionList.value = []
}

/** 输入状态提示节流 */
let typingThrottleTimer: ReturnType<typeof setTimeout> | null = null
let isTypingThrottled = false

/** 触发输入状态 */
function triggerTyping() {
  if (isTypingThrottled)
    return
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

// ===== textarea 自动增高（1 行起步，最多 5 行，超出内滚）=====

/** 根据内容调整 textarea 高度 */
function autoGrow() {
  const el = textareaRef.value
  if (!el)
    return
  el.style.height = 'auto'
  const style = getComputedStyle(el)
  const lineHeight = Number.parseFloat(style.lineHeight) || 22
  const verticalPadding
    = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
  const maxHeight = lineHeight * 5 + verticalPadding
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

watch(text, () => {
  nextTick(autoGrow)
})

// ===== 语音录制（微信式：按住说话，上滑取消）=====

/** 是否处于语音模式（textarea 换成"按住 说话"按钮） */
const isVoiceMode = ref(false)

/** 是否正在录音 */
const isRecording = ref(false)

/** 是否处于上滑取消区域 */
const isCancelZone = ref(false)

/** 录音时长（秒，用于浮层展示） */
const recordDuration = ref(0)

/** 上滑取消阈值（px） */
const CANCEL_SLIDE_THRESHOLD = 60

let recordStartTs = 0
let recordStartY = 0
let recordTimer: ReturnType<typeof setInterval> | null = null

/** 语音按钮引用 */
const voiceBtnRef = ref<HTMLElement>()

/** 切换语音模式 */
function toggleVoiceMode() {
  isVoiceMode.value = !isVoiceMode.value
  if (isVoiceMode.value) {
    // 进入语音模式：收起面板与键盘
    textareaRef.value?.blur()
    activePanel.value = 'none'
  }
}

/** 停止录音计时器 */
function stopRecordTimer() {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

/** 按下开始录音 */
function startRecord(e: PointerEvent) {
  if (isRecording.value)
    return
  voiceBtnRef.value?.setPointerCapture?.(e.pointerId)
  recordStartTs = Date.now()
  recordStartY = e.clientY
  recordDuration.value = 0
  isCancelZone.value = false
  isRecording.value = true
  recordTimer = setInterval(() => {
    recordDuration.value = Math.floor((Date.now() - recordStartTs) / 1000)
  }, 200)
  emit('voice-start')
}

/** 按住滑动：超过阈值进入取消态 */
function onRecordMove(e: PointerEvent) {
  if (!isRecording.value)
    return
  isCancelZone.value = recordStartY - e.clientY > CANCEL_SLIDE_THRESHOLD
}

/** 松开结束录音：取消态则取消，否则发送 */
function finishRecord(forceCancel = false) {
  if (!isRecording.value)
    return
  isRecording.value = false
  stopRecordTimer()
  const duration = Math.floor((Date.now() - recordStartTs) / 1000)
  if (forceCancel || isCancelZone.value) {
    emit('voice-cancel')
  }
  else {
    emit('voice-end', duration)
  }
  isCancelZone.value = false
}

// ===== 文件选择 =====

const albumInputRef = ref<HTMLInputElement>()
const cameraInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()

/** 更多面板网格入口（按 features 开关显隐） */
const moreItems = computed(() => {
  const items: Array<{ key: string, icon: string, label: string, action: () => void }> = []
  if (features.value.image) {
    items.push({
      key: 'album',
      icon: 'files-media/img',
      label: t('chat.input.album'),
      action: () => albumInputRef.value?.click(),
    })
    items.push({
      key: 'camera',
      icon: 'audio-video/camera',
      label: t('chat.input.camera'),
      action: () => cameraInputRef.value?.click(),
    })
  }
  if (features.value.video) {
    items.push({
      key: 'video',
      icon: 'audio-video/video_camera',
      label: t('chat.input.video'),
      action: () => videoInputRef.value?.click(),
    })
  }
  if (features.value.file) {
    items.push({
      key: 'file',
      icon: 'files-media/folder',
      label: t('chat.input.file'),
      action: () => fileInputRef.value?.click(),
    })
  }
  if (props.enableMention) {
    items.push({
      key: 'mention',
      icon: 'misc/at',
      label: t('chat.input.mention'),
      action: () => {
        activePanel.value = 'none'
        onMentionBtnClick()
      },
    })
  }
  return items
})

/** 文件选择完成：发送并关闭更多面板 */
function onFileSelected(type: 'image' | 'file' | 'video', event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length > 0) {
    emit('send-file', type, files)
    ;(event.target as HTMLInputElement).value = ''
  }
  activePanel.value = 'none'
}

// ===== @提及（行为对齐 simple-input.vue）=====

/** 获取 textarea/input 光标像素坐标 */
function getCaretCoordinates(el: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div')
  const style = getComputedStyle(el)
  const elRect = el.getBoundingClientRect()
  const styleProps = ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'whiteSpace', 'wordWrap', 'width']
  styleProps.forEach((p) => {
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
  span.textContent = el.value.substring(position) || '​'
  div.appendChild(span)
  document.body.appendChild(div)
  const rect = span.getBoundingClientRect()
  document.body.removeChild(div)
  return { left: rect.left, top: rect.top + rect.height }
}

/** 点击 @按钮：末尾插入 '@' 并打开提及面板（选择联系人后 insertMention 可定位替换） */
function onMentionBtnClick() {
  if (!props.enableMention || isVoiceMode.value)
    return
  const el = textareaRef.value
  text.value = `${text.value}@`
  nextTick(() => {
    el?.focus()
    const pos = text.value.length
    el?.setSelectionRange(pos, pos)
  })
  // H5 端提及面板为底部 Popup，anchor 仅作类型占位
  emit('mention-trigger', el ?? document.body, '')
}

/** 检测是否触发了 @提及 */
function detectMention() {
  if (!props.enableMention)
    return
  const el = textareaRef.value
  if (!el)
    return
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
    if (value[i] === ' ' || value[i] === '\n')
      break
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
  const el = textareaRef.value
  if (!el)
    return

  const pos = el.selectionStart || 0
  const value = el.value

  // 往前找到 @ 的位置
  let atPos = pos - 1
  while (atPos >= 0 && value[atPos] !== '@') {
    atPos--
  }
  if (atPos < 0)
    return

  const before = value.substring(0, atPos)
  const after = value.substring(pos)
  text.value = `${before}@${contact.name} ${after}`

  // 记录 mention
  if (!mentionList.value.find(m => m.userId === contact.userId))
    mentionList.value.push(contact)

  // 恢复光标位置
  nextTick(() => {
    const newPos = before.length + contact.name.length + 2 // @name + 空格
    el.setSelectionRange(newPos, newPos)
    el.focus()
  })
}

/** 在末尾追加 @提及 */
function appendMention(contact: MentionContact) {
  const el = textareaRef.value
  if (!el)
    return
  const prefix = text.value.length > 0 && !text.value.endsWith(' ') ? ' ' : ''
  text.value = `${text.value}${prefix}@${contact.name} `
  if (!mentionList.value.find(m => m.userId === contact.userId))
    mentionList.value.push(contact)
  nextTick(() => {
    el.focus()
    const newPos = text.value.length
    el.setSelectionRange(newPos, newPos)
  })
}

/** 在光标位置插入 Emoji */
function insertEmoji(emoji: string) {
  const el = textareaRef.value
  if (!el) {
    // 语音模式下无 textarea，直接追加到末尾
    text.value += emoji
    return
  }

  const start = el.selectionStart || 0
  const end = el.selectionEnd || 0
  const value = el.value

  text.value = value.substring(0, start) + emoji + value.substring(end)

  nextTick(() => {
    const newPos = start + emoji.length
    el.setSelectionRange(newPos, newPos)
  })
}

/** 选择表情包（sticker）：收起面板并上抛给外层发送 */
function onSelectSticker(sticker: EmojiStickerItem) {
  activePanel.value = 'none'
  emit('sticker-select', sticker)
}

/** 设置输入文本 */
function setText(value: string) {
  text.value = value
  mentionList.value = []
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

/** 获取当前输入文本 */
function getText(): string {
  return text.value
}

/** 自动聚焦 */
onMounted(() => {
  if (props.config?.autoFocus)
    textareaRef.value?.focus()
})

/** 组件卸载时清理计时器 */
onBeforeUnmount(() => {
  stopRecordTimer()
  if (typingThrottleTimer) {
    clearTimeout(typingThrottleTimer)
    typingThrottleTimer = null
  }
})

defineExpose({
  setText,
  getText,
  insertEmoji,
  insertMention,
  appendMention,
})
</script>

<template>
  <div class="h5-input" :style="rootStyle">
    <!-- 工具条：[语音切换] [输入区] [表情] [+ / 发送] -->
    <div class="h5-input__toolbar">
      <button
        v-if="features.voice"
        type="button"
        class="h5-input__icon-btn"
        :class="{ 'h5-input__icon-btn--active': isVoiceMode }"
        @click="toggleVoiceMode"
      >
        <Icon :name="isVoiceMode ? 'audio-video/mic_on' : 'audio-video/mic'" :size="24" />
      </button>

      <!-- 文本输入：auto-grow textarea -->
      <textarea
        v-if="!isVoiceMode"
        ref="textareaRef"
        v-model="text"
        class="h5-input__textarea"
        :placeholder="t('chat.placeholder')"
        :maxlength="maxLengthValue"
        rows="1"
        @input="onInput"
        @focus="onTextareaFocus"
      />

      <!-- 语音模式：按住 说话 -->
      <div
        v-else
        ref="voiceBtnRef"
        class="h5-input__voice-btn"
        :class="{ 'h5-input__voice-btn--recording': isRecording }"
        @pointerdown.prevent="startRecord"
        @pointermove="onRecordMove"
        @pointerup="finishRecord()"
        @pointercancel="finishRecord(true)"
        @contextmenu.prevent
      >
        {{ isRecording ? t('chat.voice.releaseEnd') : t('chat.voice.holdTalk') }}
      </div>

      <button
        v-if="features.emoji"
        type="button"
        class="h5-input__icon-btn"
        :class="{ 'h5-input__icon-btn--active': activePanel === 'emoji' }"
        @click="togglePanel('emoji')"
      >
        <Icon name="emojis-reactions/face" :size="24" />
      </button>

      <!-- 有文本时「+」替换为发送按钮 -->
      <Button
        v-if="text.trim()"
        type="primary"
        size="small"
        class="h5-input__send-btn"
        @click="handleSend"
      >
        {{ t('chat.send') }}
      </Button>
      <button
        v-else
        type="button"
        class="h5-input__icon-btn"
        :class="{ 'h5-input__icon-btn--active': activePanel === 'more' }"
        @click="togglePanel('more')"
      >
        <Icon name="actions/plus_in_circle" :size="24" />
      </button>
    </div>

    <!-- 表情面板（工具条下方展开，高度与键盘对齐） -->
    <div
      v-if="activePanel === 'emoji'"
      class="h5-input__panel"
      :style="{ height: panelHeightVar }"
    >
      <EmojiPicker
        class="h5-input__emoji-picker"
        :show="true"
        :sticker-packs="stickerPacks"
        @select="insertEmoji"
        @select-sticker="onSelectSticker"
        @update:show="activePanel = 'none'"
      />
    </div>

    <!-- 更多面板 -->
    <div
      v-else-if="activePanel === 'more'"
      class="h5-input__panel"
      :style="{ height: panelHeightVar }"
    >
      <div class="h5-input__more-grid">
        <div
          v-for="item in moreItems"
          :key="item.key"
          class="h5-input__more-item"
          @click="item.action"
        >
          <div class="h5-input__more-icon">
            <Icon :name="item.icon" :size="26" />
          </div>
          <span class="h5-input__more-label">{{ item.label }}</span>
        </div>
        <slot name="toolbar-extra" :toggle-panel="toggleCustomPanel" :show-panel="false" :close-panel="closeCustomPanel" />
      </div>
    </div>

    <!-- 自定义面板：由 #input-panel 插槽填充 -->
    <div
      v-else-if="activePanel === 'custom'"
      class="h5-input__panel"
      :style="{ height: panelHeightVar }"
    >
      <slot name="input-panel" :show-panel="true" :close-panel="closeCustomPanel" />
    </div>

    <!-- 录音浮层：时长 + 上滑取消提示 -->
    <div
      v-if="isRecording"
      class="h5-input__record-overlay"
      :class="{ 'h5-input__record-overlay--cancel': isCancelZone }"
    >
      <Icon name="audio-video/mic_on" :size="32" />
      <span class="h5-input__record-duration">{{ recordDuration }}s</span>
      <span class="h5-input__record-hint">
        {{ isCancelZone ? t('chat.voice.releaseToCancel') : t('chat.voice.slideUpCancel') }}
      </span>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="albumInputRef"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="onFileSelected('image', $event)"
    />
    <input
      ref="cameraInputRef"
      type="file"
      accept="image/*"
      capture
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
.h5-input {
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-input-bg);
  border-top: 1px solid var(--uikit-border-color);
}

.h5-input__toolbar {
  display: flex;
  align-items: flex-end;
  gap: var(--uikit-container-gap, 8px);
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
}

.h5-input__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  transition: color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.h5-input__icon-btn--active {
  color: var(--uikit-primary-color);
}

.h5-input__textarea {
  flex: 1;
  min-width: 0;
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  outline: none;
  /* font-size ≥ 16px，防止 iOS focus 自动缩放 */
  font-size: var(--uikit-font-size-16);
  line-height: 1.4;
  font-family: inherit;
  color: var(--uikit-text-primary);
  background-color: var(--uikit-bg-secondary);
  resize: none;
  overflow-y: hidden;
  caret-color: v-bind(caretColorVar);
}

.h5-input__textarea::placeholder {
  color: var(--uikit-text-tertiary);
}

.h5-input__textarea::selection {
  background-color: v-bind(selectionColorVar);
}

.h5-input__voice-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
  font-size: var(--uikit-font-size-16);
  line-height: 1.4;
  color: var(--uikit-text-primary);
  user-select: none;
  cursor: pointer;
  touch-action: none;
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.h5-input__voice-btn--recording {
  background-color: var(--uikit-bg-hover);
}

.h5-input__send-btn {
  flex-shrink: 0;
}

/* 底部面板（表情 / 更多），高度由父级 :style 注入（与键盘高度对齐） */
.h5-input__panel {
  overflow: hidden;
  border-top: 1px solid var(--uikit-border-color);
  padding-bottom: var(--uikit-safe-bottom, 0px);
}

.h5-input__emoji-picker {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.h5-input__emoji-picker :deep(.emoji-picker__body) {
  max-height: none;
  height: calc(100% - 41px);
}

/* 更多面板网格 */
.h5-input__more-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 12px;
  padding: 20px;
}

.h5-input__more-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.h5-input__more-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.h5-input__more-item:active .h5-input__more-icon {
  background-color: var(--uikit-bg-hover);
}

.h5-input__more-label {
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

/* 录音浮层 */
.h5-input__record-overlay {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-border-color);
  color: var(--uikit-text-primary);
  pointer-events: none;
}

.h5-input__record-overlay--cancel {
  color: var(--uikit-primary-color);
  border-color: var(--uikit-primary-color);
}

.h5-input__record-duration {
  font-size: var(--uikit-font-size-16);
  font-variant-numeric: tabular-nums;
}

.h5-input__record-hint {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-secondary);
}
</style>
