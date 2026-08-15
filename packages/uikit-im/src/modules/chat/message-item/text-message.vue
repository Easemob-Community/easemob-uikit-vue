<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { INJECTION_KEY, STREAM_CUSTOM_TYPE, STREAM_MESSAGE_STATUS } from '../../../constants'
import { useLocale } from '../../../locale'
import { linkify } from '../../../utils/linkify'
import type { LinkSegment } from '../../../utils/linkify'
import { isStreamActive } from '../../../utils/stream-message'
import Icon from '../../../components/icon/icon.vue'
import type { TextMessageType } from '../../../store/message'
import type { BubbleShape, ChatConfig } from '../types'

export interface TextMessageProps {
  message: TextMessageType
}

export interface TextMessageEmits {
  (e: 'reedit', message: TextMessageType): void
  (e: 'mention-click', userId: string): void
}

const props = defineProps<TextMessageProps>()
const emit = defineEmits<TextMessageEmits>()

const themeStore = useThemeStore()

/** 气泡形状：config.messageList.bubbleShape 优先，未配置回落主题全局 bubbleShape（message-bubble-wrapper provide） */
const injectedBubbleShape = inject<ComputedRef<BubbleShape | undefined>>(INJECTION_KEY.BUBBLE_SHAPE, computed(() => undefined))
const bubbleClass = computed(() =>
  (injectedBubbleShape.value ?? themeStore.bubbleShape) === 'square'
    ? 'text-message__bubble--square'
    : '',
)

const { t } = useLocale()

/** 注入 textMessage 配置（由 chat.vue provide） */
const textMessageConfig = inject<ComputedRef<ChatConfig['textMessage'] | undefined>>(INJECTION_KEY.TEXT_MESSAGE_CONFIG, computed(() => undefined))

/** 是否启用链接识别，默认 true */
const enableLinkify = computed(() => textMessageConfig.value?.enableLinkify !== false)

/** 链接点击拦截器 */
const linkClickHandler = computed(() => textMessageConfig.value?.onLinkClick)

/** 是否启用 @提及高亮识别，默认 true */
const enableMentionHighlight = computed(() => textMessageConfig.value?.enableMentionHighlight !== false)

/** @提及点击拦截器（优先使用配置回调，其次 emit） */
const mentionClickHandler = computed(() => textMessageConfig.value?.onMentionClick)

/** 提取消息中的 @提及列表（来自 ext.em_at_list） */
const mentionList = computed(() => {
  if (!enableMentionHighlight.value)
    return []
  const ext = (props.message as unknown as { ext?: Record<string, any> }).ext
  const list = ext?.em_at_list
  if (Array.isArray(list))
    return list as string[]
  return []
})

/** 将消息文本按 @mention 和 linkify 分片 */
const msgSegments = computed(() => {
  const text = props.message.body.content || ''
  if (!text)
    return []

  const mentions = mentionList.value
  if (mentions.length === 0) {
    // 无 mention，仅做 linkify
    if (!enableLinkify.value)
      return [{ type: 'text' as const, value: text }]
    return linkify(text)
  }

  // 有 mention：先按 @name 拆分，再对每段做 linkify
  const result: Array<LinkSegment | { type: 'mention', value: string, userId: string }> = []

  let lastIndex = 0
  const atRegex = /@(\S+)/g
  let match = atRegex.exec(text)

  while (match !== null) {
    const index = match.index
    const name = match[1]
    const full = match[0]

    if (index > lastIndex) {
      const beforeText = text.substring(lastIndex, index)
      if (enableLinkify.value) {
        result.push(...linkify(beforeText))
      }
      else {
        result.push({ type: 'text', value: beforeText })
      }
    }

    result.push({ type: 'mention', value: full, userId: name })
    lastIndex = index + full.length
    match = atRegex.exec(text)
  }

  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex)
    if (enableLinkify.value) {
      result.push(...linkify(afterText))
    }
    else {
      result.push({ type: 'text', value: afterText })
    }
  }

  return result
})

/** 译文文本分片 */
const translationSegments = computed(() => {
  if (!enableLinkify.value)
    return null
  const text = props.message.translation?.text
  if (!text)
    return null
  return linkify(text)
})

/** 是否含有链接（用于决定是否用分片渲染） */
const translationHasLinks = computed(() => !!translationSegments.value?.some(s => s.type === 'link'))

/** 是否显示重新编辑 */
const showReedit = computed(() => props.message.recalled && props.message.isSelf && props.message.originalMsg)

/**
 * 流式消息状态（仅 SDK onStreamMessage 派发的接收文本消息挂载；
 * 分片已由事件层按 msgServerId 合并写入 body.content，这里只负责展示态）。
 */
const streamState = computed(() => props.message.stream)

/**
 * 是否为内核处理的纯文本流：customType 缺省或 'text'。
 * markdown 等富格式流类型由插件通过 #message-txt / #message-custom 插槽接管，内核不渲染特殊态。
 */
const isPlainTextStream = computed(() => {
  const stream = streamState.value
  if (!stream)
    return false
  const customType = stream.customType
  return customType === undefined || customType === STREAM_CUSTOM_TYPE.TEXT
})

/** 流式传输中：气泡尾部显示打字机光标 */
const isStreaming = computed(() => isStreamActive(streamState.value?.status))

/** 流式异常结束：气泡尾部提示生成异常（保留已生成的部分内容） */
const isStreamError = computed(() => streamState.value?.status === STREAM_MESSAGE_STATUS.ERROR)

/** 是否已被编辑：以消息体 modifiedInfo 字段为准（历史消息拉取也会带），兼容本地 modified 标记 */
const isModified = computed(() => (!!props.message.modifiedInfo) && !props.message.recalled)

/** 是否存在译文 */
const hasTranslation = computed(() => !!props.message.translation?.text)

/** 是否优先显示译文 */
const showTranslated = computed(() => hasTranslation.value && props.message.showTranslation !== false)

/** 是否正在翻译中 */
const translating = computed(() => !!props.message.translating)

/** 是否需要显示译文卡片：翻译中 / 已有译文且未隐藏（切换入口在右键菜单） */
const showTranslationCard = computed(() => translating.value || (hasTranslation.value && showTranslated.value))

function onReedit() {
  emit('reedit', props.message)
}

/** 链接点击处理：支持拦截器 */
function onLinkClick(url: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  const handler = linkClickHandler.value
  if (handler) {
    const result = handler(url)
    if (result === false)
      return
    if (typeof result === 'string') {
      window.open(result, '_blank', 'noopener,noreferrer')
      return
    }
  }
  // 默认行为：新窗口打开
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** @提及点击 */
function onMentionClick(userId: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  const handler = mentionClickHandler.value
  if (handler) {
    handler(userId)
    return
  }
  emit('mention-click', userId)
}
</script>

<template>
  <div class="text-message" :class="{ 'text-message--self': props.message.isSelf }">
    <!-- 已撤回状态：只显示重新编辑按钮（提示文案在 message-bubble-wrapper 统一处理） -->
    <template v-if="props.message.recalled">
      <button
        v-if="showReedit"
        class="text-message__reedit-btn"
        @click.stop="onReedit"
      >
        {{ t('message.reedit') ?? '重新编辑' }}
      </button>
    </template>
    <!-- 正常文本 -->
    <template v-else>
      <div class="text-message__bubble" :class="bubbleClass">
        <div class="text-message__content">
          <!-- 流式纯文本（内核内置）：传输中尾部打字机光标 / 异常提示；终态收敛为普通文本。
               customType 为 markdown 等富类型时由插件插槽接管，不走此分支。 -->
          <template v-if="isPlainTextStream && (isStreaming || isStreamError)">
            <span class="text-message__stream-text">{{ props.message.body.content }}</span>
            <span v-if="isStreaming" class="text-message__stream-cursor" aria-hidden="true" />
            <span v-else-if="isStreamError" class="text-message__stream-error">
              {{ t('message.stream.error') }}
            </span>
          </template>
          <!-- 普通文本：启用 linkify 或包含 mention 时用分片渲染 -->
          <template v-else>
            <template v-if="msgSegments.length > 0">
              <template v-for="(seg, idx) in msgSegments" :key="idx">
                <a
                  v-if="seg.type === 'link'"
                  class="text-message__link"
                  :href="seg.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click="onLinkClick(seg.href!, $event)"
                >{{ seg.value }}</a>
                <span
                  v-else-if="seg.type === 'mention'"
                  class="text-message__mention"
                  @click="onMentionClick(seg.userId, $event)"
                >{{ seg.value }}</span>
                <span v-else>{{ seg.value }}</span>
              </template>
            </template>
            <!-- 无链接/mention 时纯文本渲染 -->
            <template v-else>
              {{ props.message.body.content }}
            </template>
            <span
              v-if="isModified"
              class="text-message__edited"
              :title="props.message.modifiedInfo ? `${t('message.edited')} ×${props.message.modifiedInfo.operationCount}` : ''"
            >
              {{ t('message.edited') }}
            </span>
          </template>
        </div>
      </div>
      <!-- 译文卡片（气泡下方独立卡片，隐藏/显示译文入口在右键菜单） -->
      <div v-if="showTranslationCard" class="text-message__translation-card">
        <!-- 翻译中 -->
        <div v-if="translating" class="text-message__translation-text text-message__translation-text--loading">
          <Icon name="actions/loading_arc" :size="14" anim="spin" />
          <span>{{ t('message.translate.loading') }}</span>
        </div>
        <!-- 已有译文：显示译文 -->
        <template v-else>
          <div class="text-message__translation-text">
            <template v-if="translationHasLinks && translationSegments">
              <template v-for="(seg, idx) in translationSegments" :key="idx">
                <a
                  v-if="seg.type === 'link'"
                  class="text-message__link text-message__link--translation"
                  :href="seg.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click="onLinkClick(seg.href!, $event)"
                >{{ seg.value }}</a>
                <span v-else>{{ seg.value }}</span>
              </template>
            </template>
            <template v-else>
              {{ props.message.translation?.text }}
            </template>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.text-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.text-message--self {
  align-items: flex-end;
}

.text-message__bubble {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-14);
  overflow-wrap: break-word;
  word-break: normal;
}

.text-message__bubble--square {
  border-radius: 4px;
}

.text-message--self .text-message__bubble {
  background-color: var(--uikit-bubble-bg-self);
  color: var(--uikit-bubble-text-self);
}

.text-message__content {
  display: inline;
}

/* 流式消息：打字机光标（仅内核纯文本流传输中显示） */
.text-message__stream-cursor {
  display: inline-block;
  width: 8px;
  height: 1em;
  margin-left: 2px;
  border-radius: 2px;
  background-color: currentColor;
  vertical-align: text-bottom;
  opacity: 0.85;
  animation: text-message-cursor-blink 1s step-end infinite;
}

@keyframes text-message-cursor-blink {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .text-message__stream-cursor {
    animation: none;
    opacity: 0.5;
  }
}

/* 流式消息：异常提示（保留已生成的部分内容，尾部追加提示） */
.text-message__stream-error {
  margin-left: 6px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
  opacity: 0.75;
  user-select: none;
}

.text-message--self .text-message__stream-error {
  color: var(--uikit-bubble-text-self);
  opacity: 0.75;
}

.text-message__edited {
  margin-left: 6px;
  font-size: var(--uikit-font-size-11);
  color: var(--uikit-text-secondary);
  opacity: 0.75;
  user-select: none;
  vertical-align: baseline;
}

.text-message--self .text-message__edited {
  color: var(--uikit-bubble-text-self);
  opacity: 0.75;
}

/* 译文卡片：独立于气泡，吸顶气泡正下方 */
.text-message__translation-card {
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other);
  color: var(--uikit-bubble-text-other);
  font-size: var(--uikit-font-size-14);
  overflow-wrap: break-word;
  word-break: normal;
  box-sizing: border-box;
}

.text-message__translation-text {
  font-size: var(--uikit-font-size-14);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-message__translation-text--loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-12);
  color: var(--uikit-text-secondary);
}

.text-message__reedit-btn {
  padding: 2px 8px;
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-primary-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .text-message__reedit-btn:hover {
    opacity: 0.8;
  }
}

/* @提及高亮样式 */
.text-message__mention {
  color: var(--uikit-primary-color);
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
}

@media (hover: hover) {
  .text-message__mention:hover {
    opacity: 0.8;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.text-message--self .text-message__mention {
  color: var(--uikit-bubble-text-self);
  text-decoration-color: var(--uikit-bubble-text-self);
  opacity: 0.9;
}
.text-message__link {
  color: var(--uikit-primary-color);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: opacity var(--uikit-anim-duration) var(--uikit-anim-easing);
  word-break: break-all;
  -webkit-tap-highlight-color: transparent;
}

@media (hover: hover) {
  .text-message__link:hover {
    opacity: 0.8;
  }
}

.text-message--self .text-message__link {
  color: var(--uikit-bubble-text-self);
  text-decoration-color: var(--uikit-bubble-text-self);
  opacity: 0.9;
}

.text-message__link--translation {
  color: var(--uikit-primary-color);
}
</style>
