<script setup lang="ts">
/**
 * 礼物入口（P3 礼物栏改造，P4 review 需求 4）：直播场景礼物不常驻横条，
 * 而是输入行一个「礼物」按钮 → 点击底部弹出礼物面板（覆盖输入区），
 * 选中即发送并关闭面板——与表情面板一致的交互形态。
 * 业务可整体覆盖容器 gift-bar 插槽接入自有礼物面板。
 */
import { ref } from 'vue'
import { EmPopup, t } from '@easemob/uikit-core'
import { CHATROOM_GIFT_EVENT, CHATROOM_GIFT_ITEMS } from '../../../constants'
import { getChatroomPopupTarget } from '../../../config/popup-target'
import { useChatroomMessage } from '../../../composables/use-chatroom-message'

export interface ChatroomGiftBarProps {
  /** 是否禁用（未进房/被禁言时不可送礼） */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChatroomGiftBarProps>(), {
  disabled: false,
})

const { sendCustom } = useChatroomMessage()

/** 礼物面板显隐（底部弹层，选中即发送并关闭） */
const showPanel = ref(false)

/** 礼物名文案（giftId → locale key） */
const GIFT_NAME_KEYS: Record<string, string> = {
  flower: 'chatroom.ui.giftNameFlower',
  like: 'chatroom.ui.giftNameLike',
  rocket: 'chatroom.ui.giftNameRocket',
  car: 'chatroom.ui.giftNameCar',
}

/** 点击礼物：发送 custom 礼物消息（失败 toast 由消息层兜底）并关闭面板 */
function handleGiftClick(giftId: string, icon: string) {
  if (props.disabled)
    return
  const giftName = t(GIFT_NAME_KEYS[giftId] ?? giftId, giftId)
  void sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName, icon }).catch(() => {})
  showPanel.value = false
}
</script>

<template>
  <div class="chatroom-gift-bar" :class="{ 'chatroom-gift-bar--disabled': disabled }">
    <!-- 礼物按钮（输入行内） -->
    <button
      class="chatroom-gift-bar__trigger"
      :disabled="disabled"
      :title="t('chatroom.ui.giftBarTitle')"
      @click="showPanel = !showPanel"
    >
      <span class="chatroom-gift-bar__trigger-icon">🎁</span>
    </button>

    <!-- 礼物面板（底部弹出，覆盖输入区） -->
    <EmPopup
      v-model:show="showPanel"
      position="bottom"
      :to="getChatroomPopupTarget() ?? undefined"
      class="chatroom-gift-bar__popup"
    >
      <div class="chatroom-gift-bar__panel">
        <div class="chatroom-gift-bar__panel-title">
          {{ t('chatroom.ui.giftBarTitle') }}
        </div>
        <div class="chatroom-gift-bar__panel-grid">
          <button
            v-for="gift in CHATROOM_GIFT_ITEMS"
            :key="gift.giftId"
            class="chatroom-gift-bar__item"
            :disabled="disabled"
            @click="handleGiftClick(gift.giftId, gift.icon)"
          >
            <span class="chatroom-gift-bar__icon">{{ gift.icon }}</span>
            <span class="chatroom-gift-bar__name">{{ t(GIFT_NAME_KEYS[gift.giftId] ?? gift.giftId, gift.giftId) }}</span>
          </button>
        </div>
      </div>
    </EmPopup>
  </div>
</template>

<style scoped>
.chatroom-gift-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.chatroom-gift-bar--disabled {
  opacity: 0.5;
}

.chatroom-gift-bar__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  cursor: pointer;
}

.chatroom-gift-bar__trigger:active {
  background: var(--uikit-bg-active, rgba(0, 0, 0, 0.08));
}

.chatroom-gift-bar__trigger:disabled {
  cursor: not-allowed;
}

.chatroom-gift-bar__trigger-icon {
  font-size: 20px;
  line-height: 1;
}

.chatroom-gift-bar__popup {
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.chatroom-gift-bar__panel {
  padding: 14px 16px calc(14px + var(--uikit-safe-bottom, 0px));
  background: var(--uikit-bg-elevated, var(--uikit-bg-base, #fff));
}

.chatroom-gift-bar__panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
  margin-bottom: 12px;
}

.chatroom-gift-bar__panel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.chatroom-gift-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  cursor: pointer;
}

.chatroom-gift-bar__item:active {
  background: var(--uikit-bg-active, rgba(0, 0, 0, 0.08));
}

.chatroom-gift-bar__item:disabled {
  cursor: not-allowed;
}

.chatroom-gift-bar__icon {
  font-size: 26px;
  line-height: 1;
}

.chatroom-gift-bar__name {
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
