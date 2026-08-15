<script setup lang="ts">
/**
 * 纯弹幕 headless 页（§5.10 一等公民实证）：**无容器**，纯 composable 驱动同一内核——
 * useChatroom（连接 + 房间生命周期）+ useChatroomMessage（消息增量订阅 + 发送），
 * 弹幕轨道 / 礼物飘屏 / 系统通知条全部自绘（本页即「渲染完全自管」的最小完整示例）。
 *
 * 系统通知经消息增量流呈现（notice 消息）：headless 无 notice 条，业务自行呈现
 * （§5.10「事件化出口」；addMessage 通知订阅者是 P4 review 补全的契约）。
 */
import { computed, ref } from 'vue'
import {
  CHATROOM_GIFT_EVENT,
  CHATROOM_GIFT_ITEMS,
  useChatroom,
  useChatroomMessage,
} from '@easemob/uikit-chatroom'
import { MESSAGE_TYPE, useClient } from '@easemob/uikit-core'
import type { UiMessage } from '@easemob/uikit-core'
import DemoSceneHeader from '../components/demo-scene-header.vue'
import DemoDanmakuStage from '../components/demo-danmaku-stage.vue'
import type { DanmakuItem } from '../components/demo-danmaku-stage.vue'

const DEFAULT_ROOM_ID = '315874547400706'

const roomIdInput = ref(DEFAULT_ROOM_ID)
const activeRoomId = ref('')
const joinError = ref('')
/** 发送输入 */
const draft = ref('')

const { connected, currentUser } = useClient()
const { isJoined, join, leave, roomInfo } = useChatroom()
const { subscribe, sendText, sendCustom } = useChatroomMessage()

/** 弹幕条目流（舞台组件增量消费） */
const danmakuItems = ref<DanmakuItem[]>([])
let itemSeq = 0

/** 追加弹幕条目（保留最近 200 条防内存增长） */
function pushDanmaku(item: Omit<DanmakuItem, 'id'>) {
  itemSeq += 1
  danmakuItems.value = [...danmakuItems.value.slice(-199), { ...item, id: itemSeq }]
}

/** 消息增量订阅（§5.10）：flush 批量回调，增量有序；按类型分流到弹幕/飘屏/通知条 */
subscribe((batch: UiMessage[]) => {
  for (const msg of batch) {
    const from = msg.from || currentUser.value || ''
    if (msg.type === MESSAGE_TYPE.NOTICE) {
      pushDanmaku({
        text: (msg.body as { content?: string }).content ?? '',
        from,
        isNotice: true,
      })
      continue
    }
    if (msg.type === MESSAGE_TYPE.TEXT) {
      pushDanmaku({
        text: (msg.body as { content?: string }).content ?? '',
        from,
      })
      continue
    }
    if (msg.type === MESSAGE_TYPE.CUSTOM) {
      const body = msg.body as { event?: string, params?: Record<string, string> }
      if (body.event === CHATROOM_GIFT_EVENT) {
        pushDanmaku({
          text: `${body.params?.giftName ?? '礼物'}`,
          from,
          isGift: true,
          giftIcon: body.params?.icon ?? '🎁',
          giftName: body.params?.giftName ?? '礼物',
        })
        continue
      }
      pushDanmaku({ text: `[自定义消息 ${body.event ?? ''}]`, from })
      continue
    }
    // 图片/语音等：headless 由业务自行呈现（演示仅记录）
    pushDanmaku({ text: `[${msg.type} 消息]`, from })
  }
})

/** 发送弹幕文本 */
function handleSendText() {
  const content = draft.value.trim()
  if (!content || !isJoined.value)
    return
  draft.value = ''
  void sendText(content).catch(() => {
    // 发送失败回填（headless 无输入框回显，回填到 draft 保证不丢文本）
    draft.value = content
  })
}

/** 发送礼物（sendCustom 礼物协议，与容器 gift-bar 同协议） */
function handleSendGift(giftId: string, icon: string) {
  if (!isJoined.value)
    return
  void sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName: giftId, icon }).catch(() => {})
}

/** 加入弹幕房（headless join：不经过容器） */
function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  joinError.value = ''
  void join(id).catch((error: unknown) => {
    joinError.value = (error as Error).message || '加入失败'
  }).then(() => {
    if (isJoined.value)
      activeRoomId.value = id
  })
}

/** 退出弹幕房 */
function handleExit() {
  void leave().then(() => {
    activeRoomId.value = ''
  })
}

const connectionText = computed(() => {
  if (!connected.value)
    return '连接断开'
  return isJoined.value ? `已入房 ${roomInfo.value?.name ?? activeRoomId.value}` : '已连接'
})
</script>

<template>
  <div class="danmaku-page">
    <DemoSceneHeader title="纯弹幕（headless）">
      <span>{{ connectionText }}</span>
    </DemoSceneHeader>

    <!-- 未入房：房间入口 -->
    <div v-if="!activeRoomId" class="danmaku-page__entry">
      <div class="danmaku-page__entry-card">
        <div class="danmaku-page__entry-title">
          🎆 接入弹幕流
        </div>
        <div class="danmaku-page__entry-desc">
          本页不渲染 EmChatroomContainer——连接 / 入房 / 消息订阅 / 发送全部由
          composable 驱动（§5.10 headless 一等公民），弹幕轨道与礼物飘屏为本页自绘。
        </div>
        <input
          v-model="roomIdInput"
          class="danmaku-page__input"
          type="text"
          placeholder="输入聊天室 ID（弹幕房）"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="danmaku-page__error">
          加入失败：{{ joinError }}
        </div>
        <button class="danmaku-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          接入弹幕流
        </button>
      </div>
    </div>

    <!-- 弹幕舞台 + 发送条（无容器形态） -->
    <template v-else>
      <DemoDanmakuStage :items="danmakuItems" />

      <div class="danmaku-page__sender">
        <div class="danmaku-page__gifts">
          <button
            v-for="gift in CHATROOM_GIFT_ITEMS"
            :key="gift.giftId"
            class="danmaku-page__gift"
            :title="gift.giftId"
            @click="handleSendGift(gift.giftId, gift.icon)"
          >
            {{ gift.icon }}
          </button>
        </div>
        <div class="danmaku-page__input-row">
          <input
            v-model="draft"
            class="danmaku-page__input danmaku-page__input--inline"
            type="text"
            placeholder="发条弹幕…"
            :disabled="!isJoined"
            @keydown.enter="handleSendText"
          >
          <button class="danmaku-page__send" :disabled="!draft.trim() || !isJoined" @click="handleSendText">
            发送
          </button>
          <button class="danmaku-page__exit" @click="handleExit">
            退出
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.danmaku-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--uikit-bg-base, #fff);
}

.danmaku-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.danmaku-page__entry-card {
  width: 100%;
  max-width: 320px;
  padding: 24px 20px;
  border-radius: 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  background: var(--uikit-bg-panel, #fff);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.danmaku-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.danmaku-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.danmaku-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.danmaku-page__input:focus {
  border-color: var(--uikit-primary-color);
}

.danmaku-page__input--inline {
  flex: 1;
  min-width: 0;
  height: 34px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.08);
  border-color: transparent;
  color: #fff;
}

.danmaku-page__input--inline::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.danmaku-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.danmaku-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.danmaku-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danmaku-page__sender {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px calc(8px + var(--uikit-safe-bottom, 0px));
  background: #101828;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.danmaku-page__gifts {
  display: flex;
  gap: 8px;
}

.danmaku-page__gift {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 18px;
  cursor: pointer;
}

.danmaku-page__gift:active {
  background: rgba(255, 255, 255, 0.14);
}

.danmaku-page__input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.danmaku-page__send {
  flex-shrink: 0;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-primary-color);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.danmaku-page__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danmaku-page__exit {
  flex-shrink: 0;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
}
</style>
