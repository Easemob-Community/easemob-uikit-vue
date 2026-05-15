<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../../store/theme'
import { useLocale } from '../../../locale'
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
    <div v-else class="text-message__bubble" :class="bubbleClass">
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
      <!-- 译文区 -->
      <template v-if="translating">
        <div class="text-message__divider" />
        <div class="text-message__translation text-message__translation--loading">
          {{ t('message.translate.loading') }}
        </div>
      </template>
      <template v-else-if="hasTranslation && showTranslated">
        <div class="text-message__divider" />
        <div class="text-message__translation">
          {{ props.message.translation?.text }}
        </div>
        <button
          class="text-message__translate-toggle"
          @click.stop="onToggleTranslation"
        >
          {{ t('message.translate.showOriginal') }}
        </button>
      </template>
      <template v-else-if="hasTranslation && !showTranslated">
        <div class="text-message__divider" />
        <button
          class="text-message__translate-toggle"
          @click.stop="onToggleTranslation"
        >
          {{ t('message.translate.showTranslated') }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.text-message {
  display: flex;
}

.text-message--self {
  justify-content: flex-end;
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

.text-message__divider {
  height: 1px;
  margin: 8px -4px 6px;
  background-color: rgba(0, 0, 0, 0.12);
}

.text-message--self .text-message__divider {
  background-color: rgba(255, 255, 255, 0.3);
}

.text-message__translation {
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-message__translation--loading {
  font-size: 12px;
  opacity: 0.7;
}

.text-message__translate-toggle {
  margin-top: 4px;
  padding: 0;
  font-size: 12px;
  color: inherit;
  opacity: 0.8;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.text-message__translate-toggle:hover {
  opacity: 1;
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
