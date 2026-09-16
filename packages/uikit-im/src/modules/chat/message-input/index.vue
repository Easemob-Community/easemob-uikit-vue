<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CONVERSATION_TYPE, EmEmojiPicker as EmojiPicker, MESSAGE_EXT_KEY, MESSAGE_TYPE, EmIcon as Icon, EmPopup as Popup, createLogger, formatSdkError, resolveSdkErrorMessage, useLocale, useToast, useViewport } from '@easemob/uikit-core'
import type { EmojiStickerItem, UiMessage } from '@easemob/uikit-core'
import { useChat } from '../../../composables/use-chat'
import { useQuote } from '../../../composables/use-quote'
import { useUIKit } from '../../../composables/use-uikit'
import { provideMessageInputPluginContext } from '../../../composables/use-chat-plugin'
import MentionPicker from '../mention/mention-picker.vue'
import QuoteBar from '../quote/quote-bar.vue'
import type { ChatConfig, ChatSendHooks, MentionContact } from '../types'
import H5Input from '../h5-input/h5-input.vue'
import SimpleInput from './simple-input.vue'
import RichInput from './rich-input.vue'
import EditingBar from './editing-bar.vue'

const props = defineProps<MessageInputProps>()

const emit = defineEmits<MessageInputEmits>()

const logger = createLogger('UIKit:Index')

export interface MessageInputProps {
  config?: ChatConfig
  /** 当前是否为群聊 */
  isGroup?: boolean
  /** 键盘高度（H5 适配用） */
  keyboardHeight?: number
  /** @提及联系人列表，传入后优先于 config.input.mention.contacts */
  mentionContacts?: MentionContact[]
  /** 当前群是否全员禁言 */
  muted?: boolean
}

export interface MessageInputEmits {
  (e: 'send-success'): void
  /** 输入框聚焦时触发（H5 键盘弹起后需滚动消息列表） */
  (e: 'focus'): void
  /** 点击工具栏翻译按钮（业务链路交由宿主接入） */
  (e: 'translation-click'): void
  /** 点击工具栏名片按钮（业务链路交由宿主接入） */
  (e: 'contact-card-click'): void
}

const { sendTextMessage, sendImageMessage, sendFileMessage, sendAudioMessage, sendVideoMessage, sendCmdMessage, currentConversation, editingMessage, exitEditMode, modifyTextMessage } = useChat()
const { features, capabilities } = useUIKit()
const { quotedMessage, clearQuote, buildQuoteExt } = useQuote()
const { isMobile } = useViewport()
const { show: showToast } = useToast()
const { t } = useLocale()

/** 输入框配置 */
const inputConfig = computed(() => props.config?.input)

/**
 * 聚焦时边框颜色：默认保持容器边框色（聚焦高亮由 --uikit-input-focus-ring 外环承担，见设计稿 msg_input focus 态），
 *  仅当显式传入 input.focusBorderColor 时才覆盖边框色。
 */
const focusBorderColorVar = computed(() => inputConfig.value?.focusBorderColor || 'var(--uikit-border-color)')

/** 发送 typing cmd（仅单聊且全局 enableTyping 开启，5s 节流由输入框子组件保证） */
function handleTyping() {
  if (features.enableTyping === false)
    return
  const cvs = currentConversation.value
  if (!cvs || cvs.type !== CONVERSATION_TYPE.SINGLECHAT)
    return
  void sendCmdMessage('TypingBegin')
}

/** 发送钩子 */
const sendHooks = computed<ChatSendHooks | undefined>(() => props.config?.hooks)

/**
 * 执行 beforeSend 钩子
 * @returns true 表示允许发送，false 表示阻止
 */
async function runBeforeSend(message: Partial<UiMessage>): Promise<boolean> {
  const hook = sendHooks.value?.beforeSend
  if (!hook)
    return true
  try {
    const result = await hook(message)
    return result !== false
  }
  catch (e) {
    logger.error('[MessageInput] beforeSend hook error:', formatSdkError(e))
    return true
  }
}

/**
 * 执行 afterSend 钩子
 */
function runAfterSend(message: any) {
  const hook = sendHooks.value?.afterSend
  if (hook) {
    try {
      hook(message)
    }
    catch (e) {
      logger.error('[MessageInput] afterSend hook error:', formatSdkError(e))
    }
  }
}

/** 输入框模式（移动端固定渲染 H5Input，不走 simple/rich 分支） */
const inputMode = computed(() => {
  const mode = inputConfig.value?.mode ?? 'simple'
  if (isMobile.value && mode === 'rich') {
    logger.warn('[MessageInput] 移动端已强制使用 H5Input，mode=rich 配置被忽略')
  }
  return mode
})

/** Emoji 选择器显示状态 */
const showEmojiPicker = ref(false)

/** 表情包（sticker）配置 */
const stickerPacks = computed(() => inputConfig.value?.stickerPacks ?? [])

/** Emoji 面板配置（recent/tabsPosition/stickerHover 等，未配置时走组件默认值） */
const emojiPickerConfig = computed(() => inputConfig.value?.emoji ?? {})

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
  if (cfg?.features?.mention === false)
    return false
  const onlyInGroup = cfg?.mention?.onlyInGroup ?? true
  if (onlyInGroup && !props.isGroup)
    return false
  return true
})

/** @提及联系人列表：传入的 props 优先，否则取 config */
const mentionContacts = computed(() => props.mentionContacts ?? inputConfig.value?.mention?.contacts ?? [])

/** SimpleInput 引用 */
const simpleInputRef = ref<InstanceType<typeof SimpleInput>>()

/** H5Input 引用（移动端） */
const h5InputRef = ref<InstanceType<typeof H5Input>>()

/** message-input 根元素引用 */
const messageInputRef = ref<HTMLElement>()

/** RichInput 引用 */
const richInputRef = ref<InstanceType<typeof RichInput>>()

/** 群已读回执配置（与 SDK 客观能力取交集：adapter 上报不支持时强制关闭） */
const groupReadReceiptConfig = computed(() =>
  capabilities.groupReadReceipt === false ? undefined : props.config?.groupReadReceipt)

/** 构造包含引用 ext 的合并对象；无引用时返回 undefined */
function buildExtWithQuote(): Record<string, any> | undefined {
  if (!quotedMessage.value)
    return undefined
  return { ...buildQuoteExt(quotedMessage.value) }
}

/** 取消编辑：退出编辑态并清空输入 */
function handleCancelEdit() {
  exitEditMode()
  setText('')
}

/** 发送文本消息（或提交编辑） */
async function handleSendText(text: string, mentionList?: MentionContact[]) {
  // 编辑模式：改为调用 modifyMessage
  if (editingMessage.value) {
    const target = editingMessage.value
    modifyTextMessage(target, text)
      .then(() => {
        setText('')
        emit('send-success')
      })
      .catch((e: any) => {
        const code = e?.type ?? e?.code
        const msg = code === 'modifiedCountExceedLimit' || /limit|count|5/i.test(String(e?.message || ''))
          ? t('message.edit.limitReached')
          : t('message.edit.failed')
        showToast(msg, 'error')
      })
    return
  }
  let ext = buildExtWithQuote()
  // 如果有 mention，写入 ext.em_at_list
  if (mentionList && mentionList.length > 0) {
    ext = ext || {}
    ext.em_at_list = mentionList.map(m => m.userId)
  }
  // beforeSend 拦截
  const canSend = await runBeforeSend({ type: MESSAGE_TYPE.TEXT, body: { content: text } })
  if (!canSend)
    return
  sendTextMessage(text, ext)
    .then((msg) => {
      emit('send-success')
      runAfterSend(msg)
    })
    .catch((e: any) => {
      logger.error('[MessageInput] sendTextMessage failed:', formatSdkError(e))
      showToast(resolveSdkErrorMessage(e, 'message.send.failed', t), 'error')
    })
  clearQuote()
}

/** 发送富文本消息（或提交编辑） */
async function handleSendRich(_html: string, text: string, mentionList?: MentionContact[]) {
  if (editingMessage.value) {
    const target = editingMessage.value
    modifyTextMessage(target, text)
      .then(() => {
        setText('')
        emit('send-success')
      })
      .catch((e: any) => {
        const code = e?.type ?? e?.code
        const msg = code === 'modifiedCountExceedLimit' || /limit|count|5/i.test(String(e?.message || ''))
          ? t('message.edit.limitReached')
          : t('message.edit.failed')
        showToast(msg, 'error')
      })
    return
  }
  let ext = buildExtWithQuote()
  // 如果有 mention，写入 ext.em_at_list
  if (mentionList && mentionList.length > 0) {
    ext = ext || {}
    ext.em_at_list = mentionList.map(m => m.userId)
  }
  // beforeSend 拦截
  const canSend = await runBeforeSend({ type: MESSAGE_TYPE.TEXT, body: { content: text } })
  if (!canSend)
    return
  sendTextMessage(text, ext)
    .then((msg) => {
      emit('send-success')
      runAfterSend(msg)
    })
    .catch((e: any) => {
      logger.error('[MessageInput] sendTextMessage failed:', formatSdkError(e))
      showToast(resolveSdkErrorMessage(e, 'message.send.failed', t), 'error')
    })
  clearQuote()
}

/** 待回收的 Blob URL 列表 */
const pendingBlobUrls = new Set<string>()

/** 发送文件消息 */
async function handleSendFile(type: 'image' | 'file' | 'video', files: FileList) {
  const file = files[0]
  if (!file)
    return

  const ext = buildExtWithQuote()

  // beforeSend 拦截
  const canSend = await runBeforeSend({ type: type === MESSAGE_TYPE.IMAGE ? MESSAGE_TYPE.IMAGE : type })
  if (!canSend)
    return

  let promise: Promise<any> | undefined
  if (type === MESSAGE_TYPE.IMAGE) {
    promise = sendImageMessage(file, groupReadReceiptConfig.value, ext)
  }
  else if (type === MESSAGE_TYPE.VIDEO) {
    const duration = await getVideoDuration(file)
    promise = sendVideoMessage(file, duration, groupReadReceiptConfig.value, ext)
  }
  else {
    promise = sendFileMessage(file, groupReadReceiptConfig.value, ext)
  }
  promise?.then((msg) => {
    emit('send-success')
    runAfterSend(msg)
  }).catch((e: any) => {
    logger.error('[MessageInput] sendFile failed:', formatSdkError(e))
    showToast(resolveSdkErrorMessage(e, 'message.send.failed', t), 'error')
  })
  clearQuote()
}

/** 读取本地视频时长（秒），失败或无法读取时兜底返回 1 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(1)
      return
    }
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    let settled = false
    const finish = (duration: number) => {
      if (settled)
        return
      settled = true
      URL.revokeObjectURL(url)
      resolve(Math.max(1, Math.floor(duration || 0)))
    }

    video.addEventListener('loadedmetadata', () => finish(video.duration))
    video.addEventListener('error', () => finish(1))

    // 5s 超时兜底
    setTimeout(() => finish(1), 5000)
  })
}

/** 打开 Emoji 选择器 */
function onEmojiClick(anchorEl: HTMLElement) {
  emojiAnchorRef.value = anchorEl
  showEmojiPicker.value = true
}

/** 选择 Emoji（移动端面板在 H5Input 内部，不会走到这里） */
function onEmojiSelect(emoji: string) {
  showEmojiPicker.value = false
  if (isMobile.value) {
    h5InputRef.value?.insertEmoji?.(emoji)
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.insertEmoji?.(emoji)
  }
  else {
    richInputRef.value?.insertEmoji?.(emoji)
  }
}

/**
 * 把 sticker 资源地址解析为可上传的 File。
 * 本地打包资源（如 demo 的 gif 资产路径）SDK 无法直接按 URL 上传，需 fetch 转成 File；
 * 远程 URL（如 CDN）能 fetch 到也走 File；跨域 fetch 失败则回落为原 URL 字符串（保持按 URL 引用）。
 */
async function resolveStickerFile(sticker: EmojiStickerItem): Promise<File | string> {
  try {
    const res = await fetch(sticker.url)
    if (!res.ok)
      return sticker.url
    const blob = await res.blob()
    const ext = /\.(\w+)(?:\?.*)?$/.exec(sticker.url)?.[1] || 'gif'
    const fileName = sticker.url.split('?')[0].split('/').pop() || `sticker.${ext}`
    return new File([blob], fileName, { type: blob.type || `image/${ext}` })
  }
  catch {
    return sticker.url
  }
}

/** 选择表情包（sticker）：以图片消息发送（本地资源先转 File），ext 打 isSticker 标记供收发双端按表情渲染（不启用图片预览） */
async function onStickerSelect(sticker: EmojiStickerItem) {
  showEmojiPicker.value = false
  const canSend = await runBeforeSend({ type: MESSAGE_TYPE.IMAGE })
  if (!canSend)
    return
  const file = await resolveStickerFile(sticker)
  sendImageMessage(file, groupReadReceiptConfig.value, { [MESSAGE_EXT_KEY.IS_STICKER]: true })
    .then((msg) => {
      emit('send-success')
      runAfterSend(msg)
    })
    .catch((e: any) => {
      logger.error('[MessageInput] sendSticker failed:', formatSdkError(e))
      showToast(resolveSdkErrorMessage(e, 'message.send.failed', t), 'error')
    })
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

/** simple 输入框展开视觉态（高度达到 212px，含拖拽超过；驱动角标 spread/singularity 切换） */
const simpleExpanded = ref(false)

/** simple 输入框自定义高度态（拖拽/展开后卡片退出固定 126px，改为内容自适应，min-height 兜底） */
const simpleDragged = ref(false)

/** simple 输入框 PC 录音模式（录音面板覆盖输入区时，隐藏卡片右上角展开角标） */
const simpleVoiceMode = ref(false)

/** 引用条位置：simple 模式工具栏在上时引用条置于输入框下方（设计稿），其余情况保持输入框上方 */
const quoteBelowInput = computed(() => !isMobile.value && inputMode.value === 'simple' && inputConfig.value?.style !== 'toolbar-bottom')

/** 展开视觉态变化：布局变化会让锚点弹层错位，主动关闭 emoji/mention 弹层 */
function onExpandChange(expanded: boolean) {
  simpleExpanded.value = expanded
  showEmojiPicker.value = false
  onMentionClose()
}

/** 收起动画（max-height 过渡）时长，需与 --uikit-anim-duration（0.2s）一致 */
const COLLAPSE_ANIM_MS = 200
let collapseTimer: ReturnType<typeof setTimeout> | null = null

/**
 * simple 输入框生效高度同步：
 * - 非 null（拖拽/展开）：立即切内容自适应，root max-height 过渡驱动卡片跟随增高；
 * - null（收起）：动画期间保持自适应让卡片跟随收缩，动画结束再回落固定 126px，避免边框跳变。
 */
function onSimpleHeightChange(height: number | null) {
  if (collapseTimer) {
    clearTimeout(collapseTimer)
    collapseTimer = null
  }
  if (height !== null) {
    simpleDragged.value = true
  }
  else {
    collapseTimer = setTimeout(() => {
      simpleDragged.value = false
      collapseTimer = null
    }, COLLAPSE_ANIM_MS)
  }
}

/** 是否显示展开/收起角标（simple 模式 PC 且未通过 config 关闭、未处于录音模式；角标渲染在卡片层右上角） */
const showSimpleExpandBtn = computed(() => !isMobile.value && inputMode.value === 'simple' && inputConfig.value?.expandable !== false && !simpleVoiceMode.value)

/** 点击卡片层角标：转发给 simple-input 切换展开/收起 */
function onExpandBtnClick() {
  simpleInputRef.value?.toggleExpand?.()
}

/** 选择 @提及联系人 */
function onMentionSelect(contact: MentionContact) {
  showMentionPicker.value = false
  const name = contact.remark || contact.name
  if (isMobile.value) {
    h5InputRef.value?.insertMention?.(contact)
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.insertMention?.(contact)
  }
  else {
    richInputRef.value?.insertMention?.(name, contact)
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

/**
 * 将音频 Blob 转换为 WAV 格式
 * 使用 Web Audio API 解码后重新编码为 WAV，确保语音转文字服务兼容
 */
async function convertToWav(audioBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext()
  try {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16
    const bytesPerSample = bitDepth / 8
    const blockAlign = numberOfChannels * bytesPerSample

    const length = audioBuffer.length
    const dataSize = length * numberOfChannels * bytesPerSample
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    // 写入 PCM 数据
    const offset = 44
    const channels: Float32Array[] = []
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    let index = 0
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        view.setInt16(offset + index, intSample, true)
        index += 2
      }
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }
  finally {
    audioContext.close()
  }
}

/** 开始录音 */
async function handleVoiceStart() {
  isVoiceCancelled = false
  shouldCancelVoice = false
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // 等待权限/设备期间已被取消（如过短录音立即走 cancel 链路，或启动期间被要求停止）：
    // 必须在此释放刚拿到的流并直接返回，否则会创建一个无人停止的 MediaRecorder，麦克风占用常亮
    if (isVoiceCancelled || shouldCancelVoice) {
      voiceStream.getTracks().forEach(track => track.stop())
      voiceStream = null
      return
    }
    mediaRecorder = new MediaRecorder(voiceStream)
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0)
        audioChunks.push(e.data)
    }

    mediaRecorder.start()
    recordingStartTime = Date.now()
  }
  catch (err) {
    logger.error('录音启动失败:', formatSdkError(err))
    showToast('录音启动失败，请检查麦克风权限', 'error')
    // 清理
    voiceStream?.getTracks().forEach(track => track.stop())
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

  const actualDuration
    = durationFromInput ?? Math.floor((Date.now() - recordingStartTime) / 1000)

  const mr = mediaRecorder

  // 如果还没开始录音（state 为 inactive），直接清理资源
  if (mr.state === 'inactive') {
    voiceStream?.getTracks().forEach(track => track.stop())
    audioChunks = []
    voiceStream = null
    mediaRecorder = null
    return
  }

  mediaRecorder.onstop = async () => {
    voiceStream?.getTracks().forEach(track => track.stop())

    if (!isVoiceCancelled && audioChunks.length > 0) {
      try {
        const recordedBlob = new Blob(audioChunks, { type: 'audio/webm' })
        // 转换为 WAV 格式以兼容语音转文字服务（支持 AMR/MP3/WAV/M4A/AAC）
        const wavBlob = await convertToWav(recordedBlob)
        const ext = buildExtWithQuote()
        // beforeSend 拦截
        const canSend = await runBeforeSend({ type: MESSAGE_TYPE.VOICE })
        if (!canSend) {
          clearQuote()
          return
        }
        sendAudioMessage(new File([wavBlob], 'voice.wav', { type: 'audio/wav' }), actualDuration, undefined, ext)
          .then((msg) => {
            emit('send-success')
            runAfterSend(msg)
          })
          .catch((e: any) => {
            logger.error('[MessageInput] sendAudioMessage failed:', formatSdkError(e))
            showToast(resolveSdkErrorMessage(e, 'message.send.failed', t), 'error')
          })
        clearQuote()
      }
      catch (err) {
        logger.error('[MessageInput] 语音格式转换失败:', formatSdkError(err))
        showToast('语音处理失败，请重试', 'error')
      }
    }

    audioChunks = []
    voiceStream = null
    if (mr === mediaRecorder)
      mediaRecorder = null
  }

  mr.stop()
}

/** 取消录音 */
function handleVoiceCancel() {
  isVoiceCancelled = true
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  voiceStream?.getTracks().forEach(track => track.stop())
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
  // 清理收起动画定时器
  if (collapseTimer) {
    clearTimeout(collapseTimer)
    collapseTimer = null
  }
})

/** 设置输入文本（用于重新编辑等场景） */
function setText(value: string) {
  if (isMobile.value) {
    h5InputRef.value?.setText?.(value)
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.setText?.(value)
  }
  else {
    richInputRef.value?.setText?.(value)
  }
}

/** 获取当前输入文本 */
function getText(): string {
  if (isMobile.value) {
    return h5InputRef.value?.getText?.() || ''
  }
  if (inputMode.value === 'simple') {
    return simpleInputRef.value?.getText?.() || ''
  }
  else {
    return richInputRef.value?.getText?.() || ''
  }
}

/** 聚焦输入框 */
function focus() {
  if (isMobile.value) {
    h5InputRef.value?.$el?.querySelector('textarea')?.focus()
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.$el?.querySelector('textarea')?.focus()
    simpleInputRef.value?.$el?.querySelector('input')?.focus()
  }
  else {
    richInputRef.value?.$el?.querySelector('[contenteditable]')?.focus()
  }
}

/** 在光标/末尾插入 @提及 */
function appendMention(contact: MentionContact) {
  if (isMobile.value) {
    h5InputRef.value?.appendMention?.(contact)
  }
  else if (inputMode.value === 'simple') {
    simpleInputRef.value?.appendMention?.(contact)
  }
  else {
    richInputRef.value?.appendMention?.(contact.name, contact)
  }
}

/** 向 plugin 提供输入框操作能力 */
provideMessageInputPluginContext({
  setText,
  getText,
  focus,
  appendMention,
})

defineExpose({
  setText,
  getText,
  appendMention,
})
</script>

<template>
  <!-- 键盘顶起 padding 仅 PC 且键盘高度非 0 时注入；0 时不要覆盖卡片默认 padding（修复 PC 底部 padding 被 0px 内联覆盖） -->
  <div
    ref="messageInputRef"
    class="message-input"
    :class="{
      'message-input--mobile': isMobile,
      'message-input--simple-pc': !isMobile && inputMode === 'simple',
      'message-input--simple-dragged': !isMobile && inputMode === 'simple' && simpleDragged,
    }"
    :style="!isMobile && props.keyboardHeight ? { paddingBottom: `${props.keyboardHeight}px` } : undefined"
  >
    <!-- 全员禁言遮罩 -->
    <div v-if="props.muted" class="message-input__muted-overlay">
      <span class="message-input__muted-text">{{ t('chat.input.mutedAll', '全员禁言中') }}</span>
    </div>

    <!-- 编辑条：优先于引用条 -->
    <EditingBar
      v-if="editingMessage"
      :message="editingMessage"
      @close="handleCancelEdit"
    />

    <!-- 引用条（simple 模式工具栏在上时移到输入框下方，见底部 QuoteBar；
         顶部展示且展开角标在场时右侧预留 28px，避免关闭 × 与角标重叠） -->
    <QuoteBar
      v-if="!editingMessage && quotedMessage && !quoteBelowInput"
      :class="{ 'message-input__quote--corner': showSimpleExpandBtn }"
      :message="quotedMessage"
      @close="clearQuote"
    />

    <!-- 移动端：微信式 H5 输入区（表情/更多面板在其内部展开，键盘高度 padding 也在其内部处理） -->
    <H5Input
      v-if="isMobile"
      ref="h5InputRef"
      :config="inputConfig"
      :enable-mention="enableMention"
      :mention-open="showMentionPicker"
      :keyboard-height="props.keyboardHeight"
      @send="handleSendText"
      @send-file="handleSendFile"
      @voice-start="handleVoiceStart"
      @voice-end="handleVoiceEnd"
      @voice-cancel="handleVoiceCancel"
      @mention-trigger="onMentionTrigger"
      @mention-close="onMentionClose"
      @sticker-select="onStickerSelect"
      @focus="emit('focus')"
      @typing="handleTyping"
    >
      <template #toolbar-extra="slotProps">
        <slot name="toolbar-extra" v-bind="slotProps" />
      </template>
      <template #input-panel="slotProps">
        <slot name="input-panel" v-bind="slotProps" />
      </template>
    </H5Input>

    <!-- 简单输入框 -->
    <SimpleInput
      v-else-if="inputMode === 'simple'"
      ref="simpleInputRef"
      :config="inputConfig"
      :enable-mention="enableMention"
      :mention-open="showMentionPicker"
      @send="handleSendText"
      @send-file="handleSendFile"
      @emoji-click="onEmojiClick"
      @voice-start="handleVoiceStart"
      @voice-end="handleVoiceEnd"
      @voice-cancel="handleVoiceCancel"
      @mention-trigger="onMentionTrigger"
      @mention-close="onMentionClose"
      @expand-change="onExpandChange"
      @height-change="onSimpleHeightChange"
      @voice-mode-change="simpleVoiceMode = $event"
      @translation-click="emit('translation-click')"
      @contact-card-click="emit('contact-card-click')"
      @focus="emit('focus')"
      @typing="handleTyping"
    >
      <template #toolbar-extra="slotProps">
        <slot name="toolbar-extra" v-bind="slotProps" />
      </template>
      <template #input-panel="slotProps">
        <slot name="input-panel" v-bind="slotProps" />
      </template>
    </SimpleInput>

    <!-- 富文本输入框 -->
    <RichInput
      v-else
      ref="richInputRef"
      :config="inputConfig"
      :enable-mention="enableMention"
      :mention-open="showMentionPicker"
      @send="handleSendRich"
      @send-file="handleSendFile"
      @emoji-click="onEmojiClick"
      @mention-trigger="onMentionTrigger"
      @mention-close="onMentionClose"
      @expand-change="onExpandChange"
      @translation-click="emit('translation-click')"
      @contact-card-click="emit('contact-card-click')"
      @focus="emit('focus')"
      @typing="handleTyping"
    >
      <template #toolbar-extra="slotProps">
        <slot name="toolbar-extra" v-bind="slotProps" />
      </template>
      <template #input-panel="slotProps">
        <slot name="input-panel" v-bind="slotProps" />
      </template>
    </RichInput>

    <!-- 引用条（simple 模式工具栏在上时置于输入框下方，贴卡片底缘；
         必须放在 v-if/v-else-if/v-else 链之后，避免 v-else 挂到本元素上导致两个输入框同显） -->
    <QuoteBar
      v-if="!editingMessage && quotedMessage && quoteBelowInput"
      :message="quotedMessage"
      @close="clearQuote"
    />

    <!-- 展开/收起角标：定位在卡片层右上角（相对 simple-input 根定位会被顶部引用条顶偏），
         24×24 默认 topright，hover 按状态显示 spread/singularity -->
    <div
      v-if="showSimpleExpandBtn"
      class="message-input__expand-btn"
      :title="simpleExpanded ? t('chat.input.collapse', '收起输入框') : t('chat.input.expand', '展开输入框')"
      @click="onExpandBtnClick"
    >
      <Icon class="message-input__expand-icon message-input__expand-icon--default" name="polyline/topright" :size="24" />
      <Icon class="message-input__expand-icon message-input__expand-icon--hover" :name="simpleExpanded ? 'polyline/singularity' : 'polyline/spread'" :size="24" />
    </div>

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
          :sticker-packs="stickerPacks"
          :recent="emojiPickerConfig.recent"
          :recent-count="emojiPickerConfig.recentCount"
          :tabs-position="emojiPickerConfig.tabsPosition"
          :sticker-hover="emojiPickerConfig.stickerHover"
          :emoji-icon="emojiPickerConfig.emojiIcon"
          @select="onEmojiSelect"
          @select-sticker="onStickerSelect"
          @update:show="showEmojiPicker = $event"
        />
      </div>
    </Popup>

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
  max-width: calc(100vw - 24px);
}
</style>

<style scoped>
.message-input {
  position: relative;
  background-color: var(--uikit-input-bg);
  border: 1px solid var(--uikit-input-border-color, #C9CDCF);
  border-radius: var(--uikit-components-radius, 8px);
  box-shadow: var(--uikit-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
  /* 设计稿 msg_input：外层间距 4px（margin），卡片内边距 8px/12px（input-padding token，随密度档缩放） */
  margin: var(--uikit-input-wrapper-spacing, 4px);
  padding: var(--uikit-input-padding-y, 8px) var(--uikit-input-padding-x, 12px);
  transition:
    border-color var(--uikit-anim-duration) var(--uikit-anim-easing),
    box-shadow var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-input:focus-within {
  border-color: v-bind(focusBorderColorVar);
  /* 设计稿 focus 态：border 不变，叠加主色 20% 外环（保留基础投影） */
  box-shadow:
    var(--uikit-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04)),
    var(--uikit-input-focus-ring, 0 0 0 2px rgba(51, 177, 255, 0.2));
}

/* simple 模式（PC）：卡片默认 126px（root 内容 108：工具栏 28 + 间距 8 + 三行文本区 72，加 chrome 18：上下 padding 8 + 1px border × 2；对齐设计稿 msg_input 默认态 124px），flex 列布局让输入框撑满（引用条/编辑条在场时挤压输入区，不改变卡片总高）；
   展开/收起动画由 simple-input root 的 height 过渡驱动（卡片 auto 高度逐帧跟随） */
.message-input--simple-pc {
  display: flex;
  flex-direction: column;
  height: 126px;
  transition: border-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

/* simple 模式自定义高度态（拖拽/展开）：退出固定高度，内容自适应（min-height 兜底） */
.message-input--simple-dragged {
  height: auto;
  min-height: 126px;
}

/* 展开/收起角标：压在卡片右上角边框角点上（设计稿 right/top -1px，相对 1px border 的 padding box 即贴合外缘），24×24，默认弱化图标色 */
.message-input__expand-btn {
  position: absolute;
  top: -1px;
  right: -1px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--uikit-components-radius, 6px);
  cursor: pointer;
  color: var(--uikit-input-border-color, #C9CDCF);
  transition:
    color var(--uikit-anim-duration) var(--uikit-anim-easing),
    background-color var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-input__expand-icon {
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

.message-input__expand-icon--hover {
  position: absolute;
  inset: 0;
  opacity: 0;
}

/* 顶部引用条为右上角展开角标预留位置（关闭 × 落在角标左侧，对齐设计稿）；双类选择器压过 quote-bar 自身 padding 简写 */
.message-input .message-input__quote--corner {
  padding-right: 28px;
}

@media (hover: hover) {
  /* hover：角标退为灰底圆角瓷砖，内部显示 spread/singularity 图标 */
  .message-input__expand-btn:hover {
    background-color: var(--uikit-bg-hover);
    color: var(--uikit-text-secondary);
  }

  .message-input__expand-btn:hover .message-input__expand-icon--default {
    opacity: 0;
  }

  .message-input__expand-btn:hover .message-input__expand-icon--hover {
    opacity: 1;
  }
}

/* 移动端：去掉桌面卡片样式（margin/border/radius/shadow），改为全宽工具条容器 */
.message-input--mobile {
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.message-input--mobile:focus-within {
  border-color: transparent;
  /* 移动端无卡片边框，聚焦光环一并关闭 */
  box-shadow: none;
}

.message-input--mobile .message-input__muted-overlay {
  border-radius: 0;
}

/* 全员禁言遮罩 */
.message-input__muted-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--uikit-input-bg);
  border-radius: var(--uikit-components-radius, 8px);
  opacity: 0.95;
}

.message-input__muted-text {
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-secondary);
}
</style>
