<script setup lang="ts">
/**
 * 直播间输入条（通用可配置壳子）：
 * - UIKIT 负责：文本输入、Enter 发送、快捷短语、发送节流、敏感词拦截、
 *   最大长度限制、禁用状态、底部安全区适配；
 * - 业务方通过插槽自定义：右侧动作按钮（礼物/菜单/分享/点赞）、底部弹层面板；
 * - 这样直播、语聊房、教室等场景可复用同一份输入条，只换动作组合。
 */
import { computed, ref } from 'vue'
import { t } from '@easemob/uikit-core'

export interface ChatroomLiveInputBarProps {
  /** 占位文案 */
  placeholder?: string
  /** 是否禁用（未进房/被禁言） */
  disabled?: boolean
  /** 禁用提示 */
  disabledHint?: string
  /** 快捷短语列表（点击即发送） */
  quickPhrases?: string[]
  /** 是否显示快捷短语行 */
  showQuickPhrases?: boolean
  /** 最大输入长度 */
  maxLength?: number
  /** 发送最小间隔（ms），小于此间隔触发 send-too-fast */
  sendIntervalMs?: number
  /** 发送过快提示文案（{{remaining}} 占位剩余毫秒） */
  sendTooFastHint?: string
  /** 拦截词库，命中则禁止发送并触发 block */
  blockWords?: string[]
  /** 拦截提示文案（{{word}} 占位命中词） */
  blockHint?: string
  /** 发送前自定义校验，返回错误文案则拦截 */
  beforeSend?: (text: string) => string | undefined | Promise<string | undefined>
  /** 乐观发送模式：跳过客户端拦截/节流/敏感词检查，直接 emit send，由业务/服务端兜底 */
  optimistic?: boolean
}

const props = withDefaults(defineProps<ChatroomLiveInputBarProps>(), {
  disabled: false,
  disabledHint: '',
  quickPhrases: () => [],
  showQuickPhrases: true,
  sendTooFastHint: '',
  blockHint: '',
  optimistic: false,
})

const emit = defineEmits<{
  /** 发送文本 */
  (e: 'send', text: string): void
  /** 点击快捷短语 */
  (e: 'phrase', phrase: string): void
  /** 发送被拦截（敏感词/自定义校验） */
  (e: 'block', text: string, reason: string): void
  /** 发送过快 */
  (e: 'send-too-fast', remainingMs: number): void
}>()

const text = ref('')
const sending = ref(false)
/** 最近一次发送时间戳 */
const lastSendAt = ref(0)
/** 当前提示（拦截/过快），2.5s 后自动清空 */
const hint = ref('')
let hintTimer: ReturnType<typeof setTimeout> | null = null

const canSend = computed(() => {
  return !props.disabled && text.value.trim().length > 0 && !sending.value
})

function showHint(message: string) {
  hint.value = message
  if (hintTimer)
    clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = ''
  }, 2500)
}

function checkThrottle(): boolean {
  if (!props.sendIntervalMs || props.sendIntervalMs <= 0)
    return true
  const elapsed = Date.now() - lastSendAt.value
  if (elapsed >= props.sendIntervalMs)
    return true
  const remaining = props.sendIntervalMs - elapsed
  const message = props.sendTooFastHint
    ? props.sendTooFastHint.replace('{{remaining}}', String(Math.ceil(remaining / 1000)))
    : t('chatroom.ui.liveSendTooFast', String(Math.ceil(remaining / 1000)))
  showHint(message)
  emit('send-too-fast', remaining)
  return false
}

function checkBlockWords(content: string): string | null {
  if (!props.blockWords || props.blockWords.length === 0)
    return null
  const lower = content.toLowerCase()
  for (const word of props.blockWords) {
    if (!word)
      continue
    if (lower.includes(word.toLowerCase())) {
      const message = props.blockHint
        ? props.blockHint.replace('{{word}}', word)
        : t('chatroom.ui.liveBlockedWord', word)
      return message
    }
  }
  return null
}

async function trySend(content: string) {
  if (sending.value)
    return
  // 乐观模式：跳过客户端拦截/节流/敏感词检查，直接 emit send（业务/服务端兜底）
  if (!props.optimistic) {
    if (!checkThrottle())
      return
    const blockReason = checkBlockWords(content)
    if (blockReason) {
      showHint(blockReason)
      emit('block', content, blockReason)
      return
    }
    if (props.beforeSend) {
      sending.value = true
      try {
        const reason = await props.beforeSend(content)
        if (reason) {
          showHint(reason)
          emit('block', content, reason)
          return
        }
      }
      finally {
        sending.value = false
      }
    }
  }
  text.value = ''
  lastSendAt.value = Date.now()
  emit('send', content)
}

/** 发送当前输入框文本 */
async function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled)
    return
  await trySend(content)
}

/** 点击快捷短语 */
async function handlePhrase(phrase: string) {
  if (props.disabled)
    return
  emit('phrase', phrase)
  await trySend(phrase)
}

/** 回车发送 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    void handleSend()
  }
}

/** 设置输入框文本（供父级回填） */
function setText(value: string) {
  text.value = value
}

defineExpose({ setText })
</script>

<template>
  <div class="live-input-bar" :class="{ 'live-input-bar--disabled': disabled }">
    <!-- 禁用提示 -->
    <div v-if="disabled && disabledHint" class="live-input-bar__hint live-input-bar__hint--disabled">
      {{ disabledHint }}
    </div>

    <!-- 动态提示（拦截/过快） -->
    <div v-if="hint" class="live-input-bar__hint">
      {{ hint }}
    </div>

    <!-- 快捷短语行（业务方可通过 slot 覆盖） -->
    <slot name="quick-phrases" :phrases="quickPhrases" :send="handlePhrase">
      <div v-if="showQuickPhrases && quickPhrases.length > 0" class="live-input-bar__phrases">
        <button
          v-for="phrase in quickPhrases"
          :key="phrase"
          class="live-input-bar__phrase"
          :disabled="disabled"
          @click="handlePhrase(phrase)"
        >
          {{ phrase }}
        </button>
      </div>
    </slot>

    <!-- 输入行 -->
    <div class="live-input-bar__row">
      <input
        v-model="text"
        class="live-input-bar__field"
        type="text"
        :placeholder="placeholder || t('chatroom.ui.liveInputPlaceholder')"
        :disabled="disabled"
        :maxlength="maxLength"
        enterkeyhint="send"
        @keydown="handleKeydown"
      >

      <!-- 右侧动作区：业务方放入礼物/菜单/分享/点赞/发送等 -->
      <slot name="actions" :text="text" :send="handleSend" :can-send="canSend" />
    </div>

    <!-- 底部弹层面板区：业务方放入礼物面板、表情面板等 -->
    <slot name="panels" />
  </div>
</template>

<style scoped>
.live-input-bar {
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 8px 12px calc(8px + var(--uikit-safe-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.live-input-bar--disabled {
  opacity: 0.6;
}

.live-input-bar__hint {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(100% + 4px);
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #f3c850;
  font-size: 12px;
  text-align: center;
  pointer-events: none;
}

.live-input-bar__hint--disabled {
  color: rgba(255, 255, 255, 0.75);
}

.live-input-bar__phrases {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.live-input-bar__phrase {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.live-input-bar__phrase:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.live-input-bar__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-input-bar__field {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 14px;
  outline: none;
}

.live-input-bar__field::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.live-input-bar__field:disabled {
  cursor: not-allowed;
}

/* 插槽动作按钮基础样式（业务方可通过附加 class 自定义颜色） */
:slotted(.live-input-bar__action) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  color: #fff;
}

:slotted(.live-input-bar__action:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
