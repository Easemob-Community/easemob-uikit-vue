<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { MESSAGE_TYPE, useLocale, useToast } from '@easemob-community/uikit-core'
import { useResizable, useViewport } from '@easemob-community/uikit-core'
import { filterActiveMentions } from '../../../utils/mention'
import { EmButton as Button } from '@easemob-community/uikit-core'
import { EmIcon as Icon } from '@easemob-community/uikit-core'
import type { MultiBodySegmentInput } from '@easemob-community/uikit-core'
import { parseMultiBodyClipboardHtml } from '../../../composables/multi-body.utils'
import { isDraftPreviewUrlRetained } from '../../../composables/use-conversation'
import type { ChatConfig, MentionContact } from '../types'
import { projectRichDocumentToMultiBodyInputs } from './rich-input-multi-body'
import type { RichDocumentNode } from './rich-input-multi-body'
import { MULTI_BODY_ATTACHMENT_NODE, MultiBodyAttachmentNode } from './rich-input-attachment-node'
import type { MultiBodyAttachmentDraftItem } from './multi-body-draft'
import { createAttachmentDraft, shouldApplyAttachmentMetadata, toMultiBodyAttachmentInputs } from './multi-body-draft'
import { getClipboardAttachmentFiles, hasHtmlImage, readVideoMetadata } from './attachment-draft'
import type { RichInputDraftSnapshot } from './input-draft'
import { cloneMessageInputDraftSnapshot } from './input-draft'

export interface RichInputProps {
  config?: ChatConfig['input']
  /** 是否启用 @提及 */
  enableMention?: boolean
  /** @提及选择弹层是否打开（打开时 Enter 优先用于选择联系人，不发送消息） */
  mentionOpen?: boolean
  enableMultiBody?: boolean
  sending?: boolean
}

const props = withDefaults(defineProps<RichInputProps>(), {
  enableMultiBody: false,
  sending: false,
})

const emit = defineEmits<{
  (e: 'send', html: string, text: string, mentionList?: MentionContact[], bodies?: readonly MultiBodySegmentInput[]): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'emoji-click', anchor: HTMLElement): void
  (e: 'voice-start'): void
  (e: 'voice-end'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
  (e: 'focus'): void
  (e: 'typing'): void
  /** 展开/收起输入区（供上层关闭 emoji/mention 等锚点弹层） */
  (e: 'expand-change', expanded: boolean): void
  /** 点击工具栏翻译按钮（业务链路交由宿主接入） */
  (e: 'translation-click'): void
  /** 点击工具栏名片按钮（业务链路交由宿主接入） */
  (e: 'contact-card-click'): void
}>()

const { t } = useLocale()
const { show: showToast } = useToast()
const { isMobile } = useViewport()

/** 输入框风格 */
const style = computed(() => props.config?.style ?? 'toolbar-top')

/** 编辑器内容区高度（拖拽后固定，null 表示未拖拽：内容自适应 + max-height 150px） */
const editorHeight = ref<number | null>(null)

/** 拖拽手柄 ref */
const resizeHandleRef = ref<HTMLElement>()

/** 组件根元素 ref（展开态测量聊天容器高度用） */
const rootRef = ref<HTMLElement>()

/** 是否处于展开态（原地撑高输入区，仅 PC） */
const expanded = ref(false)

/** 展开前的编辑器高度（含用户拖拽值），收起时恢复 */
let preExpandHeight: number | null = null

/** 是否显示展开/收起按钮（PC 且未通过 config 关闭） */
const showExpandBtn = computed(() => !isMobile.value && props.config?.expandable !== false)

/** 是否显示拖拽手柄（PC 且未通过 config 关闭；展开态下隐藏，避免拖拽 clamp 与展开高度冲突） */
const showResizeHandle = computed(() => !isMobile.value && props.config?.resizable !== false && !expanded.value)

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

/** 功能开关（translation/contactCard 默认关闭：仅渲染按钮，业务链路交由宿主接入） */
const features = computed(() => ({
  emoji: props.config?.features?.emoji !== false,
  image: props.config?.features?.image !== false,
  file: props.config?.features?.file !== false,
  voice: props.config?.features?.voice !== false,
  video: props.config?.features?.video !== false,
  translation: props.config?.features?.translation === true,
  contactCard: props.config?.features?.contactCard === true,
}))

/** 是否显示发送按钮：显式配置优先；未配置时 PC 隐藏（回车发送）、移动端显示 */
const showSendButton = computed(() => props.config?.showSendButton ?? !isMobile.value)

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

let restoringDraftSnapshot = false

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
    MultiBodyAttachmentNode.configure({
      isSending: () => props.sending,
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
    draftVersion.value += 1
    updateHasContent(e)
    if (!restoringDraftSnapshot) {
      syncInlineImageFiles(e.getHTML())
      syncInlineAttachments(e.getJSON())
    }
    triggerTyping()
  },
  onFocus: () => emit('focus'),
  editorProps: {
    attributes: {
      class: 'rich-input__editor-content',
    },
    handlePaste: (_view, event) => {
      const data = event.clipboardData
      const pastedText = data?.getData('text/plain') || ''
      if (maxLength.value > 0) {
        const text = _view.state.doc.textContent
        if (text.length + pastedText.length > maxLength.value) {
          event.preventDefault()
          return true
        }
      }
      if (!props.enableMultiBody || !data)
        return false
      const copiedSegments = parseMultiBodyClipboardHtml(data.getData('text/html'))
      if (copiedSegments) {
        event.preventDefault()
        insertCopiedMultiBody(copiedSegments)
        return true
      }
      const files = getClipboardAttachmentFiles(data, {
        image: features.value.image,
        video: features.value.video,
        file: features.value.file,
      })
      if (files.length === 0) {
        if (!hasHtmlImage(data.getData('text/html')))
          return false
        event.preventDefault()
        if (pastedText)
          editor.value?.chain().focus().insertContent({ type: 'text', text: pastedText }).run()
        showToast(t('message.multiBody.unsupportedInlineImage', '仅支持粘贴本地图片文件'), 'warning')
        return true
      }
      event.preventDefault()
      if (pastedText)
        editor.value?.chain().focus().insertContent({ type: 'text', text: pastedText }).run()
      void addAttachmentFiles(files)
      return true
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
          if (!editor.value)
            return
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
      // 展开态下 Esc 收起输入区（mention 弹层打开时让弹层先处理 Esc）
      if (event.key === 'Escape' && expanded.value && !props.mentionOpen) {
        event.preventDefault()
        toggleExpand()
        return true
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        // @提及弹层打开时，Enter 优先交给弹层选择联系人，不发送消息
        if (props.mentionOpen) {
          event.preventDefault()
          return true
        }
        event.preventDefault()
        if (event.isComposing || event.keyCode === 229)
          return true
        handleSend()
        return true
      }
      return false
    },
  },
})

/** 展开态目标高度：聊天容器高度的 50%，clamp 在 240~600px */
function getExpandedHeight(): number {
  const container = rootRef.value?.closest('.chat') as HTMLElement | null
  const base = container?.clientHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 600)
  return Math.min(Math.max(Math.round(base * 0.5), 240), 600)
}

/** 切换展开/收起：只改高度，不重建编辑器，内容与光标保留 */
function toggleExpand() {
  if (expanded.value) {
    editorHeight.value = preExpandHeight
    expanded.value = false
  }
  else {
    preExpandHeight = editorHeight.value
    editorHeight.value = getExpandedHeight()
    expanded.value = true
  }
  emit('expand-change', expanded.value)
  editor.value?.commands.focus()
}

const editorHasContent = ref(false)
const attachments = ref<MultiBodyAttachmentDraftItem[]>([])
const draftVersion = ref(0)
const attachmentGeneration = ref(0)
const pendingVideoMetadata = ref(0)
watch(attachments, () => {
  draftVersion.value += 1
}, { deep: true })
const hasContent = computed(() => editorHasContent.value || (props.enableMultiBody && attachments.value.length > 0))

function updateHasContent(e: any) {
  const text = e.getText().trim()
  const html = e.getHTML()
  editorHasContent.value = text.length > 0 || html.includes('<img') || html.includes('data-rich-input-attachment')
}

/** 待回收的内联图片 Blob URL 列表 */
const inlineImageBlobUrls = new Set<string>()
const inlineImageFiles = new Map<string, File | MultiBodySegmentInput>()
const copiedAttachmentInputs = new Map<string, MultiBodySegmentInput>()
let copiedAttachmentSequence = 0

function syncInlineImageFiles(html: string) {
  for (const [url] of inlineImageFiles) {
    if (html.includes(url))
      continue
    inlineImageFiles.delete(url)
    inlineImageBlobUrls.delete(url)
    if (!props.sending && url.startsWith('blob:') && !isDraftPreviewUrlRetained(url))
      URL.revokeObjectURL(url)
  }
}

function revokeUnretainedAttachmentUrls(items: readonly MultiBodyAttachmentDraftItem[]): void {
  for (const item of items) {
    if (!item.previewUrl.startsWith('blob:') || isDraftPreviewUrlRetained(item.previewUrl))
      continue
    URL.revokeObjectURL(item.previewUrl)
    item.previewUrl = ''
  }
}

function insertInlineImages(files: readonly File[]) {
  for (const file of files) {
    const url = URL.createObjectURL(file)
    inlineImageBlobUrls.add(url)
    inlineImageFiles.set(url, file)
    editor.value?.chain().focus().setImage({ src: url }).run()
  }
}

async function hydrateVideoMetadata(item: MultiBodyAttachmentDraftItem, generation: number) {
  pendingVideoMetadata.value += 1
  try {
    const metadata = await readVideoMetadata(item.file)
    if (shouldApplyAttachmentMetadata(item, attachments.value, generation, attachmentGeneration.value))
      Object.assign(item, metadata)
  }
  finally {
    pendingVideoMetadata.value -= 1
  }
}

function syncInlineAttachments(document: RichDocumentNode) {
  const ids = new Set<string>()
  function collect(node: RichDocumentNode) {
    if (node.type === MULTI_BODY_ATTACHMENT_NODE && typeof node.attrs?.attachmentId === 'string')
      ids.add(node.attrs.attachmentId)
    node.content?.forEach(collect)
  }
  collect(document)

  const removedItems = attachments.value.filter(item => !ids.has(item.id))
  if (!props.sending)
    revokeUnretainedAttachmentUrls(removedItems)
  attachments.value = attachments.value.filter(item => ids.has(item.id))
  for (const id of copiedAttachmentInputs.keys()) {
    if (!ids.has(id))
      copiedAttachmentInputs.delete(id)
  }
}

function insertInlineAttachment(item: {
  id: string
  type: MultiBodyAttachmentDraftItem['type']
  fileName: string
  fileSize: number
}) {
  editor.value?.chain().focus().insertContent({
    type: MULTI_BODY_ATTACHMENT_NODE,
    attrs: {
      attachmentId: item.id,
      attachmentType: item.type,
      fileName: item.fileName,
      fileSize: item.fileSize,
    },
  }).run()
}

function addAttachmentFiles(files: readonly File[]) {
  const generation = attachmentGeneration.value
  for (const file of files) {
    if (props.sending)
      return
    if (file.type.startsWith('image/')) {
      insertInlineImages([file])
      continue
    }
    const type = file.type.startsWith('video/') ? MESSAGE_TYPE.VIDEO : MESSAGE_TYPE.FILE
    const item = createAttachmentDraft(file, type)
    attachments.value.push(item)
    insertInlineAttachment({ id: item.id, type: item.type, fileName: item.file.name, fileSize: item.file.size })
    if (type === MESSAGE_TYPE.VIDEO)
      void hydrateVideoMetadata(item, generation)
  }
}

function insertCopiedMultiBody(segments: readonly MultiBodySegmentInput[]) {
  for (const segment of segments) {
    if (props.sending)
      return
    if (segment.type === MESSAGE_TYPE.TEXT) {
      editor.value?.chain().focus().insertContent({ type: 'text', text: segment.content }).run()
      continue
    }
    if (segment.type === MESSAGE_TYPE.IMAGE) {
      const src = segment.thumbnailUrl || segment.originalUrl
      if (!src)
        continue
      inlineImageFiles.set(src, segment)
      editor.value?.chain().focus().setImage({ src }).run()
      continue
    }
    if (segment.type !== MESSAGE_TYPE.FILE && segment.type !== MESSAGE_TYPE.VIDEO)
      continue

    copiedAttachmentSequence += 1
    const id = `copied-${Date.now()}-${copiedAttachmentSequence}`
    copiedAttachmentInputs.set(id, segment)
    insertInlineAttachment({
      id,
      type: segment.type,
      fileName: segment.filename || (segment.type === MESSAGE_TYPE.FILE ? t('message.file', 'file') : t('message.video', 'video')),
      fileSize: segment.fileLength ?? (segment.type === MESSAGE_TYPE.FILE ? segment.fileSize : undefined) ?? 0,
    })
  }
}

function getInlineAttachmentInputs() {
  const inputs = new Map(copiedAttachmentInputs)
  for (const item of attachments.value)
    inputs.set(item.id, toMultiBodyAttachmentInputs([item])[0]!)
  return inputs
}

function clearAttachments() {
  attachmentGeneration.value += 1
  const currentEditor = editor.value
  if (currentEditor && !currentEditor.isDestroyed) {
    currentEditor.chain().command(({ state, tr }) => {
      const ranges: { from: number, to: number }[] = []
      state.doc.descendants((node, pos) => {
        if (node.type.name === MULTI_BODY_ATTACHMENT_NODE)
          ranges.push({ from: pos, to: pos + node.nodeSize })
      })
      for (const range of ranges.reverse())
        tr.delete(range.from, range.to)
      return true
    }).run()
  }
  if (!props.sending)
    revokeUnretainedAttachmentUrls(attachments.value)
  attachments.value = []
  copiedAttachmentInputs.clear()
}

function getMultiBodyInputs(): readonly MultiBodySegmentInput[] {
  return projectRichDocumentToMultiBodyInputs(
    editor.value?.getJSON() || {},
    inlineImageFiles,
    [],
    getInlineAttachmentInputs(),
  )
}

/** 发送消息 */
function handleSend() {
  if (!editor.value || !hasContent.value || props.sending)
    return
  if (pendingVideoMetadata.value > 0) {
    showToast(t('message.multiBody.preparing', '正在读取视频信息，请稍后发送'), 'warning')
    return
  }
  const html = editor.value.getHTML()
  const text = editor.value.getText()
  let bodies: readonly MultiBodySegmentInput[] | undefined
  try {
    bodies = props.enableMultiBody ? getMultiBodyInputs() : undefined
  }
  catch {
    showToast(t('message.multiBody.unsupportedInlineImage', '仅支持粘贴本地图片文件'), 'warning')
    return
  }
  if (bodies && bodies.length > 20) {
    showToast(t('message.multiBody.tooMany', '最多支持 20 段内容'), 'warning')
    return
  }
  const activeMentions = filterActiveMentions(text, mentionList.value)
  emit('send', html, text, activeMentions.length > 0 ? activeMentions : undefined, bodies)
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

async function onFileSelected(type: 'image' | 'file' | 'video', event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0)
    return
  if (props.enableMultiBody)
    await addAttachmentFiles(Array.from(files))
  else if (type === MESSAGE_TYPE.IMAGE)
    insertInlineImages([files[0]!])
  else
    emit('send-file', type, files)
  input.value = ''
}

/** 语音录制 */
function toggleVoice() {
  if (isRecording.value) {
    isRecording.value = false
    emit('voice-end')
  }
  else {
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
  if (!editor.value || mentionAnchorPos.value < 0)
    return
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
  if (!editor.value)
    return
  editor.value
    .chain()
    .focus()
    .insertContent(`@${name} `)
    .run()
  if (contact && !mentionList.value.find(m => m.userId === contact.userId)) {
    mentionList.value.push(contact)
  }
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

function getDraftSnapshot(): RichInputDraftSnapshot | null {
  if (!editor.value || !hasContent.value)
    return null
  return cloneMessageInputDraftSnapshot({
    mode: 'rich',
    document: editor.value.getJSON(),
    inlineImageFiles,
    inlineImageBlobUrls,
    attachments: attachments.value,
    copiedAttachmentInputs,
    mentionList: mentionList.value,
  })
}

function restoreDraftSnapshot(snapshot: RichInputDraftSnapshot | null): void {
  restoringDraftSnapshot = true
  attachmentGeneration.value += 1
  inlineImageBlobUrls.clear()
  inlineImageFiles.clear()
  copiedAttachmentInputs.clear()
  attachments.value = []
  mentionList.value = []
  try {
    if (snapshot) {
      const restored = cloneMessageInputDraftSnapshot(snapshot)
      for (const [url, source] of restored.inlineImageFiles)
        inlineImageFiles.set(url, source)
      for (const url of restored.inlineImageBlobUrls)
        inlineImageBlobUrls.add(url)
      for (const [id, input] of restored.copiedAttachmentInputs)
        copiedAttachmentInputs.set(id, input)
      attachments.value = restored.attachments
      mentionList.value = restored.mentionList
    }
    editor.value?.commands.setContent(snapshot?.document || '')
  }
  finally {
    restoringDraftSnapshot = false
  }
  if (editor.value)
    updateHasContent(editor.value)
  draftVersion.value += 1
  const generation = attachmentGeneration.value
  for (const item of attachments.value) {
    if (item.type === MESSAGE_TYPE.VIDEO && item.duration === undefined)
      void hydrateVideoMetadata(item, generation)
  }
}

function getDraftVersion() {
  return draftVersion.value
}

function getDraftPreviewUrls() {
  return [
    ...inlineImageBlobUrls,
    ...attachments.value.map(item => item.previewUrl).filter(url => url.startsWith('blob:')),
  ]
}

function hasPreviewUrl(url: string) {
  return inlineImageBlobUrls.has(url) || attachments.value.some(item => item.previewUrl === url)
}

function clearDraft() {
  editor.value?.commands.clearContent()
  if (!props.sending) {
    inlineImageBlobUrls.forEach((url) => {
      if (url.startsWith('blob:') && !isDraftPreviewUrlRetained(url))
        URL.revokeObjectURL(url)
    })
  }
  inlineImageBlobUrls.clear()
  inlineImageFiles.clear()
  mentionList.value = []
  clearAttachments()
}

watch(() => props.enableMultiBody, (enabled) => {
  if (!enabled)
    clearAttachments()
})

/** 暴露方法 */
defineExpose({
  insertMention,
  appendMention,
  insertEmoji,
  setText,
  getText,
  getDraftSnapshot,
  restoreDraftSnapshot,
  getMultiBodyInputs,
  clearDraft,
  clearAttachments,
  getDraftVersion,
  getDraftPreviewUrls,
  hasPreviewUrl,
})

/** 组件卸载时销毁编辑器并回收 Blob URL */
onBeforeUnmount(() => {
  editor.value?.destroy()
  if (!props.sending) {
    inlineImageBlobUrls.forEach((url) => {
      if (url.startsWith('blob:') && !isDraftPreviewUrlRetained(url))
        URL.revokeObjectURL(url)
    })
  }
  inlineImageBlobUrls.clear()
  inlineImageFiles.clear()
  clearAttachments()
  if (typingThrottleTimer) {
    clearTimeout(typingThrottleTimer)
    typingThrottleTimer = null
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="rich-input"
    :class="{
      'rich-input--toolbar-bottom': style === 'toolbar-bottom',
      'rich-input--toolbar-top': style === 'toolbar-top',
      'rich-input--expanded': expanded,
      'rich-input--sending': sending,
    }"
    :style="cssVars"
  >
    <!-- 工具栏 -->
    <div class="rich-input__toolbar">
      <div v-if="features.emoji" ref="emojiBtnRef" class="rich-input__tool-btn" @click="onEmojiClick">
        <Icon name="circle/face" :size="20" />
      </div>
      <div v-if="features.image" class="rich-input__tool-btn" @click="triggerFileInput('image')">
        <Icon name="rect/img" :size="20" />
      </div>
      <div v-if="features.video" class="rich-input__tool-btn" @click="triggerFileInput('video')">
        <Icon name="rect/triangle" :size="20" />
      </div>
      <div v-if="features.file" class="rich-input__tool-btn" @click="triggerFileInput('file')">
        <Icon name="file/empty" :size="20" />
      </div>
      <div v-if="features.translation" class="rich-input__tool-btn" :title="t('chat.input.translate', '翻译')" @click="emit('translation-click')">
        <Icon name="dict" :size="20" />
      </div>
      <div v-if="features.contactCard" class="rich-input__tool-btn" :title="t('chat.input.contactCard', '发送名片')" @click="emit('contact-card-click')">
        <Icon name="person/card" :size="20" />
      </div>
      <div v-if="features.voice" class="rich-input__tool-btn" @click="toggleVoice">
        <Icon :name="isRecording ? 'mic' : 'mic'" :size="20" />
      </div>
      <slot name="toolbar-extra" :toggle-panel="togglePanel" :show-panel="showPanel" :close-panel="closePanel" />
      <!-- 展开/收起输入区（仅 PC，工具栏右端） -->
      <div
        v-if="showExpandBtn"
        class="rich-input__tool-btn rich-input__expand-btn"
        :title="expanded ? t('chat.input.collapse', '收起输入框') : t('chat.input.expand', '展开输入框')"
        @click="toggleExpand"
      >
        <Icon :name="expanded ? 'chevron/up' : 'chevron/down'" :size="20" />
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="rich-input__field-area">
      <template v-if="!isRecording">
        <div class="rich-input__editor-wrapper">
          <EditorContent :editor="editor" />
          <div v-if="!hasContent" class="rich-input__placeholder">
            {{ t('chat.placeholder') }}
          </div>
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
        :loading="sending"
        :disabled="sending || pendingVideoMetadata > 0 || !hasContent"
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
      :multiple="enableMultiBody"
      style="display: none"
      @change="onFileSelected('image', $event)"
    >
    <input
      ref="videoInputRef"
      type="file"
      accept="video/*"
      :multiple="enableMultiBody"
      style="display: none"
      @change="onFileSelected('video', $event)"
    >
    <input
      ref="fileInputRef"
      type="file"
      :multiple="enableMultiBody"
      style="display: none"
      @change="onFileSelected('file', $event)"
    >
  </div>
</template>

<style>
/* Tiptap 编辑器内容区样式（全局，避免 scoped 穿透问题） */
.rich-input__editor-content {
  min-height: 60px;
  height: var(--rich-input-editor-height, auto);
  max-height: var(--rich-input-editor-max-height, 150px);
  /* 内边距由卡片层提供（--uikit-input-padding-y/x），文本与工具栏图标共用卡片左缘 */
  padding: 0;
  outline: none;
  font-size: var(--uikit-font-size-15);
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
  width: auto;
  height: auto;
  max-width: min(240px, 100%);
  max-height: 160px;
  object-fit: contain;
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

/* 工具栏在下：输入框在上 */
.rich-input--toolbar-bottom {
  flex-direction: column-reverse;
}

/* 工具栏在上：输入框在下 */
.rich-input--toolbar-top {
  flex-direction: column;
}

.rich-input__toolbar {
  display: flex;
  align-items: center;
  /* 28px 热区 + 8px 间距 = 图标视觉间距 16px（设计稿 msg_input actions 行） */
  gap: var(--uikit-container-gap, 8px);
}

/* 展开/收起按钮：固定在工具栏右端 */
.rich-input__expand-btn {
  margin-left: auto;
}

.rich-input__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--uikit-components-radius, 6px);
  cursor: pointer;
  color: var(--uikit-text-secondary);
  transition:
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing),
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
  flex-direction: column;
  align-items: stretch;
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
  top: 0;
  left: 0;
  color: var(--uikit-text-tertiary, #919BA1);
  pointer-events: none;
  /* 占位文字比正文（15px）小一档，对齐抽屉假搜索框 13px 的观感 */
  font-size: var(--uikit-font-size-13);
  line-height: 1.5;
}

.rich-input__voice-btn {
  flex: 1;
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  border-radius: var(--uikit-input-radius, 999px);
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-border-color);
  text-align: center;
  font-size: var(--uikit-font-size-13);
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
