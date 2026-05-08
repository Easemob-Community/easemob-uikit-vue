<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useLocale } from '../../../locale'
import { useViewport } from '../../../composables/use-viewport'
import Button from '../../../components/button/button.vue'
import Icon from '../../../components/icon/icon.vue'
import type { ChatConfig } from '../types'

export interface RichInputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
}

const props = defineProps<RichInputProps>()

const emit = defineEmits<{
  (e: 'send', html: string, text: string): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'emoji-click'): void
  (e: 'voice-start'): void
  (e: 'voice-end'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
}>()

const { t } = useLocale()
const { isMobile } = useViewport()

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

/** 是否正在录音 */
const isRecording = ref(false)

/** @提及锚点位置 */
const mentionAnchorPos = ref(-1)

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
  onCreate: ({ editor: e }) => updateHasContent(e),
  onUpdate: ({ editor: e }) => updateHasContent(e),
  editorProps: {
    attributes: {
      class: 'rich-input__editor-content',
    },
    handleKeyDown: (_view, event) => {
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
  emit('send', html, text)
  editor.value.commands.clearContent()
  // 发送后回收内联图片 blob URL
  inlineImageBlobUrls.forEach((url) => URL.revokeObjectURL(url))
  inlineImageBlobUrls.clear()
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

/** 插入 @提及 */
function insertMention(name: string) {
  if (!editor.value || mentionAnchorPos.value < 0) return
  const currentPos = editor.value.state.selection.from
  editor.value
    .chain()
    .focus()
    .deleteRange({ from: mentionAnchorPos.value, to: currentPos })
    .insertContent(`@${name} `)
    .run()
  mentionAnchorPos.value = -1
}

/** 暴露方法 */
defineExpose({
  insertMention,
})

/** 组件卸载时销毁编辑器并回收 Blob URL */
onBeforeUnmount(() => {
  editor.value?.destroy()
  inlineImageBlobUrls.forEach((url) => URL.revokeObjectURL(url))
  inlineImageBlobUrls.clear()
})
</script>

<template>
  <div
    class="rich-input"
    :class="{
      'rich-input--feishu': style === 'feishu',
      'rich-input--wechat': style === 'wechat',
    }"
  >
    <!-- 工具栏 -->
    <div class="rich-input__toolbar">
      <div v-if="features.emoji" class="rich-input__tool-btn" @click="emit('emoji-click')">
        <Icon name="emojis-reactions/face" :size="22" />
      </div>
      <div v-if="features.image" class="rich-input__tool-btn" @click="triggerFileInput('image')">
        <Icon name="files-media/img" :size="22" />
      </div>
      <div v-if="features.video" class="rich-input__tool-btn" @click="triggerFileInput('video')">
        <Icon name="audio-video/video_camera" :size="22" />
      </div>
      <div v-if="features.file" class="rich-input__tool-btn" @click="triggerFileInput('file')">
        <Icon name="files-media/file" :size="22" />
      </div>
      <div v-if="features.voice" class="rich-input__tool-btn" @click="toggleVoice">
        <Icon :name="isRecording ? 'audio-video/mic_on' : 'audio-video/mic'" :size="22" />
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="rich-input__field-area">
      <template v-if="!isRecording">
        <div class="rich-input__editor-wrapper">
          <EditorContent :editor="editor" />
          <div v-if="!hasContent" class="rich-input__placeholder">{{ t('chat.placeholder') }}</div>
        </div>
      </template>
      <div v-else class="rich-input__voice-btn">
        {{ isRecording ? '松开结束录音' : '按住说话' }}
      </div>
    </div>

    <!-- 发送按钮 -->
    <div class="rich-input__actions">
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
  max-height: 150px;
  padding: 8px 12px;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  color: var(--uikit-text-primary);
  overflow-y: auto;
}

.rich-input__editor-content p {
  margin: 0 0 8px;
}

.rich-input__editor-content p:last-child {
  margin-bottom: 0;
}

.rich-input__editor-content img {
  max-width: 100%;
  border-radius: 4px;
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
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--uikit-bg-secondary);
  border-top: 1px solid #e5e7eb;
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
  gap: 12px;
}

.rich-input__tool-btn {
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

.rich-input__tool-btn:hover {
  background-color: var(--uikit-bg-hover, #e5e7eb);
  color: var(--uikit-text-primary);
}

.rich-input__field-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.rich-input__editor-wrapper {
  flex: 1;
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: var(--uikit-bg-base);
  transition: border-color 0.2s;
}

.rich-input__editor-wrapper:focus-within {
  border-color: var(--uikit-primary-color);
}

.rich-input__placeholder {
  position: absolute;
  top: 8px;
  left: 12px;
  color: var(--uikit-text-secondary);
  pointer-events: none;
  font-size: 14px;
  line-height: 1.5;
}

.rich-input__voice-btn {
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

.rich-input__voice-btn:active {
  background-color: var(--uikit-bg-hover, #e5e7eb);
}

.rich-input__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
