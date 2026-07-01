<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import { linkify } from '../../../utils/linkify'
import type { LinkSegment } from '../../../utils/linkify'
import Icon from '../../../components/icon/icon.vue'
import type { TextMessageType } from '../../../store/message'
import type { ChatConfig } from '../types'

export interface TextMessageProps {
  message: TextMessageType
}

export interface TextMessageEmits {
  (e: 'reedit', message: TextMessageType): void
  (e: 'toggle-translation', message: TextMessageType): void
  (e: 'mention-click', userId: string): void
}

const props = defineProps<TextMessageProps>()
const emit = defineEmits<TextMessageEmits>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'text-message__bubble--square' : '',
)

const { t } = useLocale()

/** 注入 textMessage 配置（由 chat.vue provide） */
const textMessageConfig = inject<ComputedRef<ChatConfig['textMessage'] | undefined>>('textMessageConfig', computed(() => undefined))

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

/** 是否已被编辑：以消息体 modifiedInfo 字段为准（历史消息拉取也会带），兼容本地 modified 标记 */
const isModified = computed(() => (!!props.message.modifiedInfo) && !props.message.recalled)

/** 是否存在译文 */
const hasTranslation = computed(() => !!props.message.translation?.text)

/** 是否优先显示译文 */
const showTranslated = computed(() => hasTranslation.value && props.message.showTranslation !== false)

/** 是否正在翻译中 */
const translating = computed(() => !!props.message.translating)

/** 是否需要显示译文卡片：翻译中 / 已有译文（无论显示原文还是译文，均显示卡片，仅文本与切换按钮不同） */
const showTranslationCard = computed(() => translating.value || hasTranslation.value)

function onReedit() {
  emit('reedit', props.message)
}

function onToggleTranslation() {
  emit('toggle-translation', props.message)
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
          <!-- 启用 linkify 或包含 mention 时用分片渲染 -->
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
        </div>
      </div>
      <!-- 译文卡片（气泡下方独立卡片） -->
      <div v-if="showTranslationCard" class="text-message__translation-card">
        <!-- 翻译中 -->
        <div v-if="translating" class="text-message__translation-text text-message__translation-text--loading">
          {{ t('message.translate.loading') }}
        </div>
        <!-- 已有译文：显示译文 -->
        <template v-else-if="showTranslated">
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
          <div class="text-message__translation-footer">
            <span class="text-message__translation-provider">
              <Icon name="actions/check_in_circle_fill" :size="12" />
              <span>{{ t('message.translate.provider') }}</span>
            </span>
            <button
              class="text-message__translate-toggle"
              @click.stop="onToggleTranslation"
            >
              {{ t('message.translate.showOriginal') }}
            </button>
          </div>
        </template>
        <!-- 已有译文：当前显示原文，提供切回译文入口 -->
        <template v-else>
          <div class="text-message__translation-footer text-message__translation-footer--center">
            <button
              class="text-message__translate-toggle"
              @click.stop="onToggleTranslation"
            >
              {{ t('message.translate.showTranslated') }}
            </button>
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
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  overflow-wrap: break-word;
  word-break: normal;
}

.text-message__bubble--square {
  border-radius: 4px;
}

.text-message--self .text-message__bubble {
  background-color: var(--uikit-primary-color);
  color: #fff;
}

.text-message__content {
  display: inline;
}

.text-message__edited {
  margin-left: 6px;
  font-size: 11px;
  color: var(--uikit-text-secondary);
  opacity: 0.75;
  user-select: none;
  vertical-align: baseline;
}

.text-message--self .text-message__edited {
  color: rgba(255, 255, 255, 0.75);
}

/* 译文卡片：独立于气泡，吸顶气泡正下方 */
.text-message__translation-card {
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bg-secondary);
  color: var(--uikit-text-primary);
  font-size: 14px;
  overflow-wrap: break-word;
  word-break: normal;
  box-sizing: border-box;
}

.text-message__translation-text {
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-message__translation-text--loading {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.text-message__translation-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.text-message__translation-footer--center {
  justify-content: flex-start;
  margin-top: 0;
}

.text-message__translation-provider {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.75;
  user-select: none;
}

.text-message__translate-toggle {
  padding: 0;
  font-size: 12px;
  color: var(--uikit-primary-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.text-message__translate-toggle:hover {
  opacity: 0.8;
}

.text-message__reedit-btn {
  padding: 2px 8px;
  font-size: 13px;
  color: var(--uikit-primary-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.text-message__reedit-btn:hover {
  opacity: 0.8;
}

/* @提及高亮样式 */
.text-message__mention {
  color: var(--uikit-primary-color);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.text-message__mention:hover {
  opacity: 0.8;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.text-message--self .text-message__mention {
  color: #fff;
  text-decoration-color: rgba(255, 255, 255, 0.7);
}
.text-message__link {
  color: var(--uikit-primary-color);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: opacity 0.15s;
  word-break: break-all;
  -webkit-tap-highlight-color: transparent;
}

.text-message__link:hover {
  opacity: 0.8;
}

.text-message--self .text-message__link {
  color: #fff;
  text-decoration-color: rgba(255, 255, 255, 0.7);
}

.text-message__link--translation {
  color: var(--uikit-primary-color);
}
</style>
