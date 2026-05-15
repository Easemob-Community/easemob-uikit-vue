<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
import Icon from '../../../components/icon/icon.vue'
import type { TextMessageType } from '../../../store/message'

export interface TextMessageProps {
  message: TextMessageType
}

export interface TextMessageEmits {
  (e: 'reedit', message: TextMessageType): void
  (e: 'toggle-translation', message: TextMessageType): void
}

const props = defineProps<TextMessageProps>()
const emit = defineEmits<TextMessageEmits>()

const themeStore = useThemeStore()
const bubbleClass = computed(() =>
  themeStore.bubbleShape === 'square' ? 'text-message__bubble--square' : ''
)

const { t } = useLocale()

/** 是否显示重新编辑 */
const showReedit = computed(() => props.message.recalled && props.message.isSelf && props.message.originalMsg)

/** 是否已被编辑：以消息体 modifiedInfo 字段为准（历史消息拉取也会带），兼容本地 modified 标记 */
const isModified = computed(() => (!!props.message.modifiedInfo || !!props.message.modified) && !props.message.recalled)

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
          {{ props.message.msg }}
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
            {{ props.message.translation?.text }}
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
</style>
