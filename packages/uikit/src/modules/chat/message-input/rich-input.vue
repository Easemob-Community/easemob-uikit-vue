<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useLocale } from '../../../locale'
import { useResizable } from '../../../composables/use-resizable'
import { useViewport } from '../../../composables/use-viewport'
import { filterActiveMentions } from '../../../utils/mention'
import Button from '../../../components/button/button.vue'
import Icon from '../../../components/icon/icon.vue'
import type { ChatConfig, MentionContact } from '../types'

export interface RichInputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
  /** @提及选择弹层是否打开（打开时 Enter 优先用于选择联系人，不发送消息） */
  mentionOpen?: boolean
}

const props = defineProps<RichInputProps>()

const emit = defineEmits<{
  (e: 'send', html: string, text: string, mentionList?: MentionContact[]): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'emoji-click', anchor: HTMLElement): void
  (e: 'voice-start'): void
  (e: 'voice-end'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
  (e: 'focus'): void
  (e: 'typing'): void
}>()

const { t } = useLocale()
const { isMobile } = useViewport()

/** 输入框风格 */
const style = computed(() => props.config?.style ?? 'wechat')

/** 编辑器内容区高度（拖拽后固定，null 表示未拖拽：内容自适应 + max-height 150px） */
const editorHeight = ref<number | null>(null)

/** 拖拽手柄 ref */
const resizeHandleRef = ref<HTMLElement>()

/** 是否显示拖拽手柄（PC 且未通过 config 关闭） */
const showResizeHandle = computed(() => !isMobile.value && props.config?.resizable !== false)

useResizable(resizeHandleRef, {
  axis: 'vertical',
  min: 60,
  max: 240,
  // 手柄在编辑器上缘：向上拖动增高（反向增量）
  invert: true,
  disabled: () => !showResizeHandle.value,
  onChange: (h) => {
    editorHeight.value = h
  },
})

/** CSS 变量（用于全局样式中的 caret/selection/编辑器高度） */
const cssVars = computed(() => ({
  '--rich-input-caret-color': props.config?.caretColor || 'auto',
  '--rich-input-selection-color': props.config?.selectionColor || 'var(--uikit-selection-bg)',
  // 拖拽后的编辑器固定高度：height 与 max-height 同值（内容少时撑满、内容多时滚动）；未拖拽时不输出，由 CSS fallback 兜底
  ...(editorHeight.value !== null
    ? {
      '--rich-input-editor-height': `${editorHeight.value}px`,
      '--rich-input-editor-max-height': `${editorHeight.value}px`,
    }
    : {}),
}))

/** 最大输入长度 */
const maxLength = computed(() => props.config?.maxLength ?? 0)

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

/** 是否正在录音 */
const isRecording = ref(false)

/** @提及锚点位置 */
const mentionAnchorPos = ref(-1)

/** 已插入的 @提及列表 */
const mentionList = ref<MentionContact[]>([])

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

/** Tiptap 编辑器实例 */
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      horizontalRule: false,
      codeBlock: false,
    }),
    Image.configure({
      inline: true,
    }),
  ],
  content: '',
  onCreate: ({ editor: e }) => {
    updateHasContent(e)
    if (props.config?.autoFocus) {
      e.commands.focus()
    }
  },
  onUpdate: ({ editor: e }) => {
    updateHasContent(e)
    triggerTyping()
  },
  onFocus: () => emit('focus'),
  editorProps: {
    attributes: {
      class: 'rich-input__editor-content',
    },
    handlePaste: (_view, event) => {
      if (maxLength.value > 0) {
        const text = _view.state.doc.textContent
        const pastedText = event.clipboardData?.getData('text/plain') || ''
        if (text.length + pastedText.length > maxLength.value) {
          event.preventDefault()
          return true
        }
      }
      return false
    },
    handleKeyDown: (_view, event) => {
      // 最大长度限制：阻止普通字符输入
      if (maxLength.value > 0 && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const text = _view.state.doc.textContent
        if (text.length >= maxLength.value) {
          event.preventDefault()
          return true
        }
      }
      if (event.key === '@' && props.enableMention) {
        mentionAnchorPos.value = _view.state.selection.from
        requestAnimationFrame(() => {
          if (!editor.value) return
          const pos = editor.value.state.selection.from
          const coords = editor.value.view.coordsAtPos(pos)
          const anchor = document.createElement('div')
          anchor.style.position = 'fixed'
          anchor.style.left = `${coords.left}px`
          anchor.style.top = `${coords.top + 20}px`
          anchor.style.width = '1px'
          anchor.style.height = '1px'
          anchor.style.pointerEvents = 'none'
          document.body.appendChild(anchor)

          const text = editor.value.getText()
          const offset = editor.value.state.selection.from
          const beforeText = text.substring(0, offset)
          const lastAt = beforeText.lastIndexOf('@')
          const keyword = lastAt >= 0 ? beforeText.substring(lastAt + 1) : ''

          emit('mention-trigger', anchor, keyword)
        })
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        // @提及弹层打开时，Enter 优先交给弹层选择联系人，不发送消息
        if (props.mentionOpen) {
          event.preventDefault()
          return true
        }
        event.preventDefault()
        handleSend()
        return true
      }
      return false
    },
  },
})

/** 是否有内容（包含文本或图片） */
const hasContent = ref(false)

function updateHasContent(e: any) {
  const text = e.getText().trim()
  const html = e.getHTML()
  hasContent.value = text.length > 0 || html.includes('<img')
}

/** 发送消息 */
function handleSend() {
  if (!editor.value || !hasContent.value) return
  const html = editor.value.getHTML()
  const text = editor.value.getText()
  // 过滤出实际出现在文本中的 mention（精确匹配，防止删除后残留/前缀误判）
  const activeMentions = filterActiveMentions(text, mentionList.value)
  emit('send', html, text, activeMentions.length > 0 ? activeMentions : undefined)
  editor.value.commands.clearContent()
  // 发送后回收内联图片 blob URL
  inlineImageBlobUrls.forEach((url) => URL.revokeObjectURL(url))
  inlineImageBlobUrls.clear()
  mentionList.value = []
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

/** 触发文件选择 */
const imageInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()

function triggerFileInput(type: 'image' | 'file' | 'video') {
  const ref = type === 'image' ? imageInputRef : type === 'video' ? videoInputRef : fileInputRef
  ref.value?.click()
}

/** 待回收的内联图片 Blob URL 列表 */
const inlineImageBlobUrls = new Set<string>()

function onFileSelected(type: 'image' | 'file' | 'video', event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files || files.length === 0) return

  if (type === 'image') {
    const file = files[0]
    const url = URL.createObjectURL(file)
    inlineImageBlobUrls.add(url)
    editor.value?.chain().focus().setImage({ src: url }).run()
    ;(event.target as HTMLInputElement).value = ''
  } else {
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

/** 点击表情按钮 */
function onEmojiClick() {
  if (emojiBtnRef.value) {
    emit('emoji-click', emojiBtnRef.value)
  }
}

/** 插入 Emoji */
function insertEmoji(emoji: string) {
  editor.value?.chain().focus().insertContent(emoji).run()
}

/** 插入 @提及（替换当前 @keyword） */
function insertMention(name: string, contact?: MentionContact) {
  if (!editor.value || mentionAnchorPos.value < 0) return
  const currentPos = editor.value.state.selection.from
  editor.value
    .chain()
    .focus()
    .deleteRange({ from: mentionAnchorPos.value, to: currentPos })
    .insertContent(`@${name} `)
    .run()
  mentionAnchorPos.value = -1
  if (contact && !mentionList.value.find(m => m.userId === contact.userId)) {
    mentionList.value.push(contact)
  }
}

/** 在末尾追加 @提及 */
function appendMention(name: string, contact?: MentionContact) {
  if (!editor.value) return
  editor.value
    .chain()
    .focus()
    .insertContent(`@${name} `)
    .run()
  if (contact && !mentionList.value.find(m => m.userId === contact.userId)) {
    mentionList.value.push(contact)
  }
}

/** @按钮 ref（作为提及面板锚点） */
const mentionBtnRef = ref<HTMLElement>()

/** 点击 @按钮：编辑器末尾插入 '@' 并打开提及面板（选择联系人后 insertMention 可定位替换） */
function onMentionBtnClick() {
  if (!editor.value || !props.enableMention)
    return
  editor.value.commands.focus()
  editor.value.commands.insertContent('@')
  // insertContent 后光标位于 '@' 之后，记录 '@' 位置供选择联系人后替换
  mentionAnchorPos.value = editor.value.state.selection.from - 1
  if (mentionBtnRef.value)
    emit('mention-trigger', mentionBtnRef.value, '')
}

/** 设置编辑器内容（用于重新编辑等场景） */
function setText(value: string) {
  editor.value?.commands.setContent(value)
  mentionList.value = []
}

/** 获取当前编辑器纯文本内容 */
function getText(): string {
  return editor.value?.getText() || ''
}

/** 暴露方法 */
defineExpose({
  insertMention,
  appendMention,
  insertEmoji,
  setText,
  getText,
})

/** 组件卸载时销毁编辑器并回收 Blob URL */
onBeforeUnmount(() => {
  editor.value?.destroy()
  inlineImageBlobUrls.forEach((url) => URL.revokeObjectURL(url))
  inlineImageBlobUrls.clear()
  if (typingThrottleTimer) {
    clearTimeout(typingThrottleTimer)
    typingThrottleTimer = null
  }
})
</script>

<template>
  <div
    class="rich-input"
    :class="{
      'rich-input--feishu': style === 'feishu',
      'rich-input--wechat': style === 'wechat',
    }"
    :style="cssVars"
  >
    <!-- 工具栏 -->
    <div class="rich-input__toolbar">
      <div v-if="features.emoji" ref="emojiBtnRef" class="rich-input__tool-btn" @click="onEmojiClick">
        <Icon name="emojis-reactions/face" :size="22" />
      </div>
      <div v-if="features.image" class="rich-input__tool-btn" @click="triggerFileInput('image')">
        <Icon name="files-media/img" :size="22" />
      </div>
      <div v-if="features.video" class="rich-input__tool-btn" @click="triggerFileInput('video')">
        <Icon name="misc/triangle_in_rect" :size="22" />
      </div>
      <div v-if="features.file" class="rich-input__tool-btn" @click="triggerFileInput('file')">
        <Icon name="files-media/file" :size="22" />
      </div>
      <div v-if="features.voice" class="rich-input__tool-btn" @click="toggleVoice">
        <Icon :name="isRecording ? 'audio-video/mic_on' : 'audio-video/mic'" :size="22" />
      </div>
      <div v-if="props.enableMention" ref="mentionBtnRef" class="rich-input__tool-btn" title="@" @click="onMentionBtnClick">
        <Icon name="misc/at" :size="22" />
      </div>
      <slot name="toolbar-extra" :toggle-panel="togglePanel" :show-panel="showPanel" :close-panel="closePanel" />
    </div>

    <!-- 输入区域 -->
    <div class="rich-input__field-area">
      <template v-if="!isRecording">
        <div class="rich-input__editor-wrapper">
          <EditorContent :editor="editor" />
          <div v-if="!hasContent" class="rich-input__placeholder">{{ t('chat.placeholder') }}</div>
          <!-- 拖拽手柄：编辑器上缘拖动调整高度（仅 PC） -->
          <div
            v-if="showResizeHandle"
            ref="resizeHandleRef"
            class="rich-input__resize-handle"
          />
        </div>
      </template>
      <div v-else class="rich-input__voice-btn">
        {{ isRecording ? t('chat.voice.releaseEnd') : t('chat.voice.holdTalk') }}
      </div>
    </div>

    <!-- 自定义面板：由 #input-panel 插槽填充 -->
    <div v-if="showPanel" class="rich-input__panel">
      <slot name="input-panel" :show-panel="showPanel" :close-panel="closePanel" />
    </div>

    <!-- 发送按钮 -->
    <div v-if="showSendButton" class="rich-input__actions">
      <Button
        type="primary"
        size="small"
        :disabled="!hasContent"
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

<style>
/* Tiptap 编辑器内容区样式（全局，避免 scoped 穿透问题） */
.rich-input__editor-content {
  min-height: 60px;
  height: var(--rich-input-editor-height, auto);
  max-height: var(--rich-input-editor-max-height, 150px);
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  outline: none;
  font-size: var(--uikit-font-size-14);
  line-height: 1.5;
  color: var(--uikit-text-primary);
  overflow-y: auto;
  caret-color: var(--rich-input-caret-color, auto);
}

.rich-input__editor-content ::selection {
  background-color: var(--rich-input-selection-color, revert);
}

.rich-input__editor-content p {
  margin: 0 0 8px;
}

.rich-input__editor-content p:last-child {
  margin-bottom: 0;
}

.rich-input__editor-content img {
  max-width: 100%;
  border-radius: var(--uikit-components-radius, 4px);
  display: inline-block;
}

.rich-input__editor-content.ProseMirror-focused {
  outline: none;
}
</style>

<style scoped>
.rich-input {
  display: flex;
  flex-direction: column;
  gap: var(--uikit-container-gap, 8px);
  background-color: transparent;
}

/* 飞书风格：输入框在上，工具栏在下 */
.rich-input--feishu {
  flex-direction: column-reverse;
}

/* 微信风格：工具栏在上，输入框在下 */
.rich-input--wechat {
  flex-direction: column;
}

.rich-input__toolbar {
  display: flex;
  align-items: center;
  gap: calc(var(--uikit-container-gap, 8px) * 1.5);
}

.rich-input__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  cursor: pointer;
  color: var(--uikit-text-secondary);
  transition: background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
              color var(--uikit-anim-duration) var(--uikit-anim-easing);
  flex-shrink: 0;
}

@media (hover: hover) {
.rich-input__tool-btn:hover {
  background-color: var(--uikit-bg-hover);
  color: var(--uikit-text-primary);
}
}

.rich-input__field-area {
  display: flex;
  align-items: flex-end;
  gap: var(--uikit-container-gap, 8px);
}

.rich-input__editor-wrapper {
  flex: 1;
  position: relative;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background-color: transparent;
}

/* 拖拽手柄：顶部边缘命中区（仅光标提示，不画视觉线） */
.rich-input__resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 6px;
  z-index: 1;
  cursor: row-resize;
  touch-action: none;
}

.rich-input__placeholder {
  position: absolute;
  top: var(--uikit-input-padding-y, 8px);
  left: var(--uikit-input-padding-x, 12px);
  color: var(--uikit-text-secondary);
  pointer-events: none;
  font-size: var(--uikit-font-size-14);
  line-height: 1.5;
}

.rich-input__voice-btn {
  flex: 1;
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  border-radius: var(--uikit-components-radius, 8px);
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-border-color);
  text-align: center;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
  cursor: pointer;
  user-select: none;
}

.rich-input__voice-btn:active {
  background-color: var(--uikit-bg-hover);
}

.rich-input__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 4px 4px 0;
}

.rich-input__panel {
  border-top: 1px solid var(--uikit-border-color);
  padding-top: 8px;
}
</style>
