<script setup lang="ts">
import { computed } from 'vue'
import { EmIcon as Icon, useLocale } from '@easemob-community/uikit-core'
import type { UiMessage } from '@easemob-community/uikit-core'

export interface VoiceTranscriptProps {
  message: UiMessage
}

const props = defineProps<VoiceTranscriptProps>()

const { t } = useLocale()

/** 是否存在转写结果 */
const hasVoiceText = computed(() => !!props.message.voiceText?.text)

/** 是否优先展示转写结果 */
const showVoiceText = computed(() => hasVoiceText.value && props.message.showVoiceText !== false)

/** 是否正在转写中 */
const voiceTranscribing = computed(() => !!props.message.voiceTranscribing)

/** 是否需要显示转文字卡片：转写中 / 已有结果且未隐藏（切换入口在右键菜单） */
const showVoiceTextCard = computed(() => voiceTranscribing.value || (hasVoiceText.value && showVoiceText.value))
</script>

<template>
  <!-- 转文字结果：气泡外独立胶囊（sub-body），与气泡垂直间距 2px（隐藏/显示文字入口在右键菜单） -->
  <div
    v-if="showVoiceTextCard"
    class="voice-transcript"
    :class="{ 'voice-transcript--self': props.message.isSelf }"
  >
    <!-- 转写中 -->
    <div v-if="voiceTranscribing" class="voice-transcript__capsule voice-transcript__capsule--loading">
      <Icon name="loading/arc/normal" :size="14" anim="spin" />
      <span>{{ t('message.voiceToText.loading') }}</span>
    </div>
    <!-- 已有结果：展示转写文字胶囊 + 已转文字标签 -->
    <template v-else>
      <div class="voice-transcript__capsule">
        {{ props.message.voiceText?.text }}
      </div>
      <div class="voice-transcript__tag">
        <Icon name="rect/hanzi" :size="12" />
        <span>{{ t('message.voiceToText.done') }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.voice-transcript {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  /* 与气泡垂直间距 2px */
  margin-top: 2px;
  max-width: 100%;
}

.voice-transcript--self {
  align-items: flex-end;
}

/* 转文字胶囊：双方统一灰底次级文字 */
.voice-transcript__capsule {
  padding: 4px 14px;
  border-radius: 12px;
  background-color: var(--uikit-bubble-bg-other, #e4e6e7);
  color: var(--uikit-text-secondary, #5e686e);
  font-size: var(--uikit-font-size-13);
  line-height: calc(18px * var(--uikit-font-scale));
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
  box-sizing: border-box;
}

.voice-transcript__capsule--loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--uikit-font-size-11);
}

/* 已转文字标签：icon + 文案，胶囊外次级文字色 */
.voice-transcript__tag {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  margin-top: 2px;
  font-size: var(--uikit-font-size-11);
  line-height: 1;
  color: var(--uikit-text-secondary, #5e686e);
  opacity: 0.75;
  user-select: none;
}

.voice-transcript--self .voice-transcript__tag {
  justify-content: flex-end;
}
</style>
