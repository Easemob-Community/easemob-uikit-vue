<script setup lang="ts">
/**
 * 礼物栏（P3，直播场景）：一排内置礼物，点击经 custom 消息发送
 * （`sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName })`，协议见 constants）。
 * 礼物消息渲染在 ChatroomMessageItem 的 custom 分支识别 event 展示；
 * 业务可整体覆盖容器 gift-bar 插槽接入自有礼物（如带 url 的动效礼物）。
 */
import { t } from '@easemob/uikit-core'
import { CHATROOM_GIFT_EVENT, CHATROOM_GIFT_ITEMS } from '../../../constants'
import { useChatroomMessage } from '../../../composables/use-chatroom-message'

export interface ChatroomGiftBarProps {
  /** 是否禁用（未进房/被禁言时不可送礼） */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChatroomGiftBarProps>(), {
  disabled: false,
})

const { sendCustom } = useChatroomMessage()

/** 礼物名文案（giftId → locale key） */
const GIFT_NAME_KEYS: Record<string, string> = {
  flower: 'chatroom.ui.giftNameFlower',
  like: 'chatroom.ui.giftNameLike',
  rocket: 'chatroom.ui.giftNameRocket',
  car: 'chatroom.ui.giftNameCar',
}

/** 点击礼物：发送 custom 礼物消息（失败 toast 由消息层兜底） */
function handleGiftClick(giftId: string, icon: string) {
  if (props.disabled)
    return
  const giftName = t(GIFT_NAME_KEYS[giftId] ?? giftId, giftId)
  void sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName, icon }).catch(() => {})
}
</script>

<template>
  <div class="chatroom-gift-bar" :class="{ 'chatroom-gift-bar--disabled': disabled }">
    <span class="chatroom-gift-bar__title">{{ t('chatroom.ui.giftBarTitle') }}</span>
    <button
      v-for="gift in CHATROOM_GIFT_ITEMS"
      :key="gift.giftId"
      class="chatroom-gift-bar__item"
      :disabled="disabled"
      :title="t(GIFT_NAME_KEYS[gift.giftId] ?? gift.giftId, gift.giftId)"
      @click="handleGiftClick(gift.giftId, gift.icon)"
    >
      <span class="chatroom-gift-bar__icon">{{ gift.icon }}</span>
      <span class="chatroom-gift-bar__name">{{ t(GIFT_NAME_KEYS[gift.giftId] ?? gift.giftId, gift.giftId) }}</span>
    </button>
  </div>
</template>

<style scoped>
.chatroom-gift-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--uikit-bg-panel, var(--uikit-bg-base));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
  overflow-x: auto;
  flex-shrink: 0;
}

.chatroom-gift-bar--disabled {
  opacity: 0.5;
}

.chatroom-gift-bar__title {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.chatroom-gift-bar__item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  border: none;
  border-radius: var(--uikit-radius-md, 8px);
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
  font-size: 22px;
  line-height: 1;
}

.chatroom-gift-bar__name {
  font-size: 11px;
  color: var(--uikit-text-secondary);
}
</style>
