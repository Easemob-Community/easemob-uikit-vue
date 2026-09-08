<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '@easemob/uikit-core'
import { useResizable, useViewport } from '@easemob/uikit-core'
import { filterActiveMentions } from '../../../utils/mention'
import { EmInput as Input } from '@easemob/uikit-core'
import { EmButton as Button } from '@easemob/uikit-core'
import { EmIcon as Icon } from '@easemob/uikit-core'
import type { ChatConfig, MentionContact } from '../types'
import VoicePanel from './components/voice-panel.vue'

export interface SimpleInputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
  /** @提及选择弹层是否打开（打开时 Enter 优先用于选择联系人，不发送消息） */
  mentionOpen?: boolean
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
  /** 展开视觉态变化（高度达到/低于 212px；供上层切换角标图标、关闭锚点弹层） */
  (e: 'expand-change', expanded: boolean): void
  /** 生效高度变化（null 表示恢复默认 132px 卡片；供上层切换卡片固定/自适应高度） */
  (e: 'height-change', height: number | null): void
  /** PC 录音模式开关变化（供上层隐藏卡片右上角展开角标等不相容 UI） */
  (e: 'voice-mode-change', active: boolean): void
}>()

const { t } = useLocale()
const { isMobile } = useViewport()

/** 输入文本 */
const text = ref('')

/** 输入框风格 */
const style = computed(() => props.config?.style ?? 'toolbar-top')

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

/** 组件根元素 ref（拖拽尺寸同步用） */
const rootRef = ref<HTMLElement>()

/**
 * 卡片 chrome 高度换算：root 内容高度 → 卡片总高度
 * （卡片 padding 上下各 var(--uikit-input-wrapper-spacing, 12px) + 1px border × 2）
 */
const CARD_CHROME_PX = 26

/** 展开态卡片目标高度（设计稿固定 212px） */
const EXPAND_CARD_HEIGHT = 212

/** 是否显示拖拽手柄（PC 且未通过 config 关闭；展开态也可拖拽，高度语义见 expandedVisual） */
const showResizeHandle = computed(() => !isMobile.value && props.config?.resizable !== false)

/** 输入区内容总高度（拖拽/展开后设置，null 表示默认 132px 卡片自适应） */
const customHeight = ref<number | null>(null)

/** 默认内容高度（卡片 132px 时的 root 高度初值 106 = 132 - 26 chrome，挂载后按实际测量值校准） */
const defaultContentHeight = ref(106)

/** 当前生效的 root 内容高度（统一高度语义：默认/拖拽/展开都是它） */
const effectiveHeight = computed(() => customHeight.value ?? defaultContentHeight.value)

/**
 * 展开视觉态（融合拖拽与展开）：当前高度达到展开高度即视为「已展开」，
 * 角标据此切换 topright/spread（可放大）与 topright/singularity（可恢复）。
 */
const expandedVisual = computed(() => effectiveHeight.value + CARD_CHROME_PX >= EXPAND_CARD_HEIGHT)

/** 拖拽手柄 ref */
const resizeHandleRef = ref<HTMLElement>()

const { size: resizeSize, isResizing } = useResizable(resizeHandleRef, {
  axis: 'vertical',
  min: 96,
  max: 480,
  // 手柄在输入卡片上缘：向上拖动增高（反向增量）
  invert: true,
  disabled: () => !showResizeHandle.value,
  onChange: (h) => {
    customHeight.value = h
    emit('height-change', h)
    emit('expand-change', expandedVisual.value)
  },
})

/** 根元素样式：内联 height 作为 flex-basis（flex: 1 1 auto 保留收缩能力，引用条在场时输入区可被挤压；过渡动画作用于 height） */
const rootStyle = computed<Record<string, string>>(() => ({
  height: `${effectiveHeight.value}px`,
}))

/** 同步拖拽起始尺寸为当前根元素实际高度（避免首次拖拽从 initial 跳变；过渡动画中调用取到中间值，恰好是继续拖拽的正确起点） */
function syncResizeSize() {
  nextTick(() => {
    if (rootRef.value)
      resizeSize.value = rootRef.value.clientHeight
  })
}

/** 角标点击：未展开 → 升到 212px；已展开（含拖拽超过 212）→ 恢复默认 132px。内容与光标保留 */
function toggleExpand() {
  customHeight.value = expandedVisual.value ? null : EXPAND_CARD_HEIGHT - CARD_CHROME_PX
  emit('height-change', customHeight.value)
  emit('expand-change', expandedVisual.value)
  syncResizeSize()
  getInputEl()?.focus()
}

/** 是否使用多行文本 */
const isMultiline = computed(() => !isMobile.value)

/** 光标颜色：默认跟随主题色 */
const caretColorVar = computed(() => props.config?.caretColor || 'var(--uikit-primary)')

/** 文本选中背景色：未配置时使用主题选中色 token，跟随主题色 */
const selectionColorVar = computed(() => props.config?.selectionColor || 'var(--uikit-selection-bg)')

/** 最大输入长度 */
const maxLengthValue = computed(() => {
  const len = props.config?.maxLength
  return len && len > 0 ? len : undefined
})

/** 移动端是否正在录音（保持原有行为） */
const isMobileRecording = ref(false)

/** 是否处于录音模式（PC 端点击麦克风后进入） */
const isVoiceMode = ref(false)

// 录音模式变化同步给上层（卡片层右上角展开角标需随之隐藏/恢复）
watch(isVoiceMode, val => emit('voice-mode-change', val))

/** 已插入的 @提及列表 */
const mentionList = ref<MentionContact[]>([])

/** 发送消息 */
function handleSend() {
  // @提及弹层打开时，Enter 优先交给弹层选择联系人，不发送消息
  if (props.mentionOpen)
    return
  const trimmed = text.value.trim()
  if (!trimmed) {
    return
  }
  // 过滤出实际出现在文本中的 mention（精确匹配，防止删除后残留/前缀误判）
  const activeMentions = filterActiveMentions(trimmed, mentionList.value)
  emit('send', trimmed, activeMentions.length > 0 ? activeMentions : undefined)
  text.value = ''
  mentionList.value = []
}

/** 输入状态提示节流 */
let isTypingThrottled = false

/** 触发输入状态 */
function triggerTyping() {
  if (isTypingThrottled) {
    return
  }
  isTypingThrottled = true
  emit('typing')
  setTimeout(() => {
    isTypingThrottled = false
  }, 5000)
}

/** 输入事件处理 */
function onInput() {
  detectMention()
  triggerTyping()
}

/** 键盘事件 */
function onKeydown(e: KeyboardEvent) {
  // 展开视觉态（含拖拽超过 212px）下 Esc 恢复默认高度（mention 弹层打开时让弹层先处理 Esc）
  if (e.key === 'Escape' && expandedVisual.value && !props.mentionOpen) {
    e.preventDefault()
    toggleExpand()
    return
  }
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
  }
  else {
    isMobileRecording.value = true
    emit('voice-start')
  }
}

/** 统一的麦克风按钮点击处理 */
function onMicClick() {
  if (isMobile.value) {
    toggleMobileVoice()
  }
  else {
    isVoiceMode.value = true
  }
}

/** 表情按钮 ref */
const emojiBtnRef = ref<HTMLElement>()

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
  span.textContent = el.value.substring(position) || '​'
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

/** 自动聚焦 + 拖拽起始尺寸同步 */
onMounted(() => {
  syncResizeSize()
  // 默认内容高度仅在挂载时校准一次（过渡动画中测量会拿到中间值，污染默认高度）
  nextTick(() => {
    if (rootRef.value && customHeight.value === null)
      defaultContentHeight.value = rootRef.value.clientHeight
  })
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

/** 暴露方法（toggleExpand/expanded 供上层在卡片层渲染右上角展开角标） */
defineExpose({
  insertMention,
  appendMention,
  insertEmoji,
  setText,
  getText,
  toggleExpand,
  expanded: expandedVisual,
})
</script>

<template>
  <div
    ref="rootRef"
    class="simple-input"
    :class="{
      'simple-input--toolbar-bottom': style === 'toolbar-bottom',
      'simple-input--toolbar-top': style === 'toolbar-top',
      'simple-input--resizing': isResizing,
    }"
    :style="rootStyle"
  >
    <!-- 工具栏：emoji / 语音 / 文件 / 图片 / 视频，间距 16px -->
    <div class="simple-input__toolbar">
      <div v-if="features.emoji" ref="emojiBtnRef" class="simple-input__tool-btn" @click="onEmojiClick">
        <Icon name="circle/face" :size="22" />
      </div>
      <div v-if="features.voice" class="simple-input__tool-btn" @click="onMicClick">
        <Icon name="mic/dot" :size="22" />
      </div>
      <div v-if="features.file" class="simple-input__tool-btn" @click="triggerFileInput('file')">
        <Icon name="folder" :size="22" />
      </div>
      <div v-if="features.image" class="simple-input__tool-btn" @click="triggerFileInput('image')">
        <Icon name="rect/img" :size="22" />
      </div>
      <div v-if="features.video" class="simple-input__tool-btn" @click="triggerFileInput('video')">
        <Icon name="rect/triangle" :size="22" />
      </div>
      <slot name="toolbar-extra" :toggle-panel="togglePanel" :show-panel="showPanel" :close-panel="closePanel" />
    </div>

    <!-- 输入区域 -->
    <div class="simple-input__field-area">
      <!-- 正常输入（PC 端或移动端非录音模式） -->
      <template v-if="!isMobileRecording">
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
          @keydown="onKeydown"
          @input="onInput"
          @focus="emit('focus')"
        />
      </template>

      <!-- 移动端语音录制按钮 -->
      <div v-else class="simple-input__voice-btn-mobile">
        {{ t('chat.voice.releaseEnd') }}
      </div>
    </div>

    <!-- PC 端录音面板：覆盖整个输入区（含功能栏），与输入框等高 -->
    <VoicePanel
      v-if="isVoiceMode && !isMobile"
      class="simple-input__voice-overlay"
      :active="isVoiceMode"
      @update:active="isVoiceMode = $event"
      @start="emit('voice-start')"
      @end="(d) => emit('voice-end', d)"
      @cancel="emit('voice-cancel')"
    />

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

    <!-- 拖拽手柄：输入卡片上缘拖动调整整体高度（仅 PC） -->
    <div
      v-if="showResizeHandle"
      ref="resizeHandleRef"
      class="simple-input__resize-handle"
    />

    <!-- 隐藏的文件输入 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileSelected('image', $event)"
    >
    <input
      ref="videoInputRef"
      type="file"
      accept="video/*"
      style="display: none"
      @change="onFileSelected('video', $event)"
    >
    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="onFileSelected('file', $event)"
    >
  </div>
</template>

<style scoped>
.simple-input {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--uikit-container-gap, 8px);
  background-color: transparent;
  /* basis 取内联 height（默认 106 / 展开 186 / 拖拽值），shrink 保留：引用条在场时输入区可被挤压 */
  flex: 1 1 auto;
  min-height: 0;
  /* 展开/收起（角标点击、Esc）平滑过渡；拖拽跟手时经 --resizing 关闭 */
  transition: height var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.simple-input--resizing {
  transition: none;
}

/* 工具栏在下：输入框在上 */
.simple-input--toolbar-bottom {
  flex-direction: column-reverse;
}

/* 工具栏在上：输入框在下 */
.simple-input--toolbar-top {
  flex-direction: column;
}

.simple-input__toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
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
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: var(--uikit-container-gap, 8px);
  position: relative;
}

/* 拖拽手柄：输入卡片上边缘命中区（仅光标提示，不画视觉线） */
.simple-input__resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--uikit-input-wrapper-spacing, 12px) - 1px);
  height: 8px;
  z-index: 2;
  cursor: row-resize;
  touch-action: none;
}

.simple-input__field {
  flex: 1;
}

.simple-input__textarea {
  flex: 1;
  min-height: 0;
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

/* PC 录音面板：绝对覆盖整个输入区（含功能栏），与输入框等高 */
.simple-input__voice-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  min-height: 0;
  border: none;
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
  flex-shrink: 0;
}

.simple-input__panel {
  border-top: 1px solid var(--uikit-border-color);
  padding-top: 8px;
}
</style>
