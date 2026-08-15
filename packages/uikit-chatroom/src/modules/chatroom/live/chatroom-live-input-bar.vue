<script setup lang="ts">
/**
 * 直播底部快捷输入区（P4 review UI 规范）：
 * - 背景栏 rgba(0,0,0,0.5) + 底部安全区（避开 home indicator）；
 * - 快捷短语行：半透明胶囊 + 右侧👁️图标，点击即发送；
 * - 输入行：[输入框「说点什么吧~」] [礼物(红底+数字角标)] [菜单] [分享] [点赞(数字)]；
 * - 礼物：点击底部弹出礼物面板（直播风格，选中即发并关闭）；
 * - 发送：回车（enterkeyhint=send），发送成功清空。
 */
import { ref } from 'vue'
import { EmPopup, t } from '@easemob/uikit-core'
import { CHATROOM_GIFT_EVENT, CHATROOM_GIFT_ITEMS } from '../../../constants'
import { getChatroomPopupTarget } from '../../../config/popup-target'
import { useChatroomMessage } from '../../../composables/use-chatroom-message'

const props = withDefaults(defineProps<{
  /** 快捷短语列表（点击即发送） */
  quickPhrases?: string[]
  /** 输入禁用（未进房/被禁言） */
  disabled?: boolean
  /** 点赞数展示（如「2.4w」） */
  likeCount?: string
}>(), {
  quickPhrases: () => ['欢迎新来的小伙伴~', '主播真棒！', '666'],
  disabled: false,
  likeCount: '',
})

const emit = defineEmits<{
  /** 发送文本 */
  (e: 'send', text: string): void
  /** 菜单按钮 */
  (e: 'menu'): void
  /** 分享按钮 */
  (e: 'share'): void
  /** 点赞（页面累计计数） */
  (e: 'like'): void
}>()

const { sendCustom } = useChatroomMessage()

const text = ref('')
/** 礼物面板显隐 */
const showGiftPanel = ref(false)
/** 礼物名文案（giftId → locale key） */
const GIFT_NAME_KEYS: Record<string, string> = {
  flower: 'chatroom.ui.giftNameFlower',
  like: 'chatroom.ui.giftNameLike',
  rocket: 'chatroom.ui.giftNameRocket',
  car: 'chatroom.ui.giftNameCar',
}

function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled)
    return
  text.value = ''
  emit('send', content)
}

function handlePhrase(phrase: string) {
  if (!props.disabled)
    emit('send', phrase)
}

/** 礼物：发送并关闭面板 */
function handleGiftClick(giftId: string, icon: string) {
  if (props.disabled)
    return
  const giftName = t(GIFT_NAME_KEYS[giftId] ?? giftId, giftId)
  void sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName, icon }).catch(() => {})
  showGiftPanel.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="live-input-bar" :class="{ 'live-input-bar--disabled': disabled }">
    <!-- 快捷短语行 -->
    <div v-if="quickPhrases.length > 0" class="live-input-bar__phrases">
      <button
        v-for="phrase in quickPhrases"
        :key="phrase"
        class="live-input-bar__phrase"
        :disabled="disabled"
        @click="handlePhrase(phrase)"
      >
        {{ phrase }}
        <span class="live-input-bar__phrase-eye">👁️</span>
      </button>
    </div>

    <!-- 输入行 -->
    <div class="live-input-bar__row">
      <input
        v-model="text"
        class="live-input-bar__field"
        type="text"
        :placeholder="t('chatroom.ui.liveInputPlaceholder')"
        :disabled="disabled"
        enterkeyhint="send"
        @keydown="handleKeydown"
      >

      <!-- 礼物（红底圆角 + 数字角标；点击弹底部面板） -->
      <button class="live-input-bar__action live-input-bar__gift" :disabled="disabled" @click="showGiftPanel = !showGiftPanel">
        <span class="live-input-bar__gift-icon">🎁</span>
        <span class="live-input-bar__badge">1</span>
      </button>

      <!-- 菜单（蓝四宫格） -->
      <button class="live-input-bar__action live-input-bar__menu" :disabled="disabled" @click="emit('menu')">
        ▦
      </button>

      <!-- 分享（紫箭头） -->
      <button class="live-input-bar__action live-input-bar__share" :disabled="disabled" @click="emit('share')">
        ↗
      </button>

      <!-- 点赞（粉心 + 数字） -->
      <button class="live-input-bar__action live-input-bar__like" :disabled="disabled" @click="emit('like')">
        <span class="live-input-bar__like-icon">❤️</span>
        <span v-if="likeCount" class="live-input-bar__like-count">{{ likeCount }}</span>
      </button>
    </div>

    <!-- 礼物面板（底部弹出，选中即发并关闭） -->
    <EmPopup
      v-model:show="showGiftPanel"
      position="bottom"
      :to="getChatroomPopupTarget() ?? undefined"
      class="live-input-bar__popup"
    >
      <div class="live-input-bar__panel">
        <div class="live-input-bar__panel-title">
          {{ t('chatroom.ui.giftBarTitle') }}
        </div>
        <div class="live-input-bar__panel-grid">
          <button
            v-for="gift in CHATROOM_GIFT_ITEMS"
            :key="gift.giftId"
            class="live-input-bar__gift-item"
            :disabled="disabled"
            @click="handleGiftClick(gift.giftId, gift.icon)"
          >
            <span class="live-input-bar__gift-item-icon">{{ gift.icon }}</span>
            <span class="live-input-bar__gift-item-name">{{ t(GIFT_NAME_KEYS[gift.giftId] ?? gift.giftId, gift.giftId) }}</span>
          </button>
        </div>
      </div>
    </EmPopup>
  </div>
</template>

<style scoped>
.live-input-bar {
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

.live-input-bar__phrase-eye {
  font-size: 11px;
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

.live-input-bar__action {
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

.live-input-bar__gift {
  background: linear-gradient(135deg, #e5484d, #ff6b6b);
}

.live-input-bar__gift-icon {
  font-size: 18px;
}

.live-input-bar__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: #f3c850;
  color: #111827;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

.live-input-bar__menu {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  font-size: 13px;
}

.live-input-bar__share {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.live-input-bar__like {
  background: linear-gradient(135deg, #ec4899, #f472b6);
  flex-direction: column;
  gap: 0;
}

.live-input-bar__like-icon {
  font-size: 14px;
  line-height: 1;
}

.live-input-bar__like-count {
  font-size: 8px;
  line-height: 1;
}

.live-input-bar__popup {
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.live-input-bar__panel {
  padding: 14px 16px calc(14px + var(--uikit-safe-bottom, 0px));
  background: var(--uikit-bg-elevated, var(--uikit-bg-base, #fff));
}

.live-input-bar__panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
  margin-bottom: 12px;
}

.live-input-bar__panel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.live-input-bar__gift-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  cursor: pointer;
}

.live-input-bar__gift-item-icon {
  font-size: 26px;
}

.live-input-bar__gift-item-name {
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
