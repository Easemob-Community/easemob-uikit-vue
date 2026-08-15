<script setup lang="ts">
/**
 * 私域直播页：live preset + 信令房双房实证（§5.9）。
 *
 * 双房链路：UI 房承载弹幕/礼物（容器全量管线），信令房承载商品指令
 * （不上屏，业务经 signal-message 回调消费）。本页演示完整业务闭环：
 * 「上架商品」→ sendCustom 发往信令房 → 业务解析指令 → 写 live:product
 * 房间属性 → 商品卡片全房间实时刷新（属性四层同步）。
 *
 * 信令房 ID 默认空（用户联调时填写；填入即数组存在即多房，无布尔开关）。
 */
import { computed, ref } from 'vue'
import {
  EmChatroomContainer,
  useChatroomAttributes,
  useChatroomMessage,
} from '@easemob/uikit-chatroom'
import type { SignalMessagePayload, SignalStatusPayload } from '@easemob/uikit-chatroom'
import DemoSceneHeader from '../components/demo-scene-header.vue'
import DemoLiveProductCard from '../components/demo-live-product-card.vue'
import type { LiveProduct } from '../components/demo-live-product-card.vue'

const DEFAULT_ROOM_ID = '315874547400706'
/** 信令房默认 ID（用户提供的联调信令房）；可改，清空退回单房形态 */
const DEFAULT_SIGNAL_ROOM_ID = '315874557886465'

const roomIdInput = ref(DEFAULT_ROOM_ID)
/** 信令房 ID：默认填入联调信令房；清空 = 单房形态 */
const signalRoomInput = ref(DEFAULT_SIGNAL_ROOM_ID)
const activeRoomId = ref('')
const joinError = ref('')

/** 商品属性（live:product）与发送能力 */
const { attributes, setAttributes } = useChatroomAttributes()
const { sendCustom } = useChatroomMessage()

/** 当前商品（属性 JSON 解析；缺失/损坏回落 null） */
const product = computed<LiveProduct | null>(() => {
  const raw = attributes.value['live:product']
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as Partial<LiveProduct>
    if (typeof parsed.name !== 'string' || typeof parsed.price !== 'number')
      return null
    return {
      name: parsed.name,
      price: parsed.price,
      emoji: parsed.emoji ?? '🛍️',
      desc: parsed.desc,
    }
  }
  catch {
    return null
  }
})

/** 信令房状态（signal-status 事件） */
const signalStatus = ref('未启用')
const signalStatusKind = ref<'idle' | 'ok' | 'err'>('idle')
/** 信令房最近指令日志（signal-message 事件，仅展示业务关心的指令） */
const signalLogs = ref<string[]>([])

/** 模拟商品清单（演示「上架商品」循环） */
const DEMO_PRODUCTS: LiveProduct[] = [
  { name: '夏日限定 T 恤', price: 89, emoji: '👕', desc: '纯棉透气，直播间专享价' },
  { name: '无线蓝牙耳机', price: 199, emoji: '🎧', desc: '主动降噪，续航 30h' },
  { name: '手冲咖啡礼盒', price: 129, emoji: '☕', desc: '精选豆 + 手冲壶套装' },
  { name: '机械键盘 87 键', price: 299, emoji: '⌨️', desc: '茶轴热插拔，RGB 背光' },
]
let productIndex = 0

/** 商品指令事件名（信令房 custom 消息；UI 房属性 key 同名前缀对齐 CHATROOM_ATTR_PREFIX.LIVE） */
const PRODUCT_EVENT = 'live:product'

/** 上架商品：指令发往信令房（sendCustom 显式 roomId，§5.9 按房发送实证） */
async function handlePublishProduct() {
  const signalRoomId = signalRoomInput.value.trim()
  if (!signalRoomId) {
    joinError.value = '请先填写信令房 ID（商品指令走信令房通道）'
    return
  }
  const next = DEMO_PRODUCTS[productIndex % DEMO_PRODUCTS.length]!
  productIndex += 1
  try {
    await sendCustom(PRODUCT_EVENT, {
      name: next.name,
      price: String(next.price),
      emoji: next.emoji,
      desc: next.desc ?? '',
    }, { roomId: signalRoomId })
    signalLogs.value = [...signalLogs.value.slice(-4), `📤 已发送上架指令：${next.name}`]
  }
  catch {
    signalLogs.value = [...signalLogs.value.slice(-4), '⚠️ 指令发送失败（信令房未加入？）']
  }
}

/** 信令房消息透传（§5.9）：解析商品指令 → 写 UI 房属性 → 商品卡刷新 */
function handleSignalMessage(payload: SignalMessagePayload) {
  const body = payload.message.body as { event?: string, params?: Record<string, string> }
  if (body.event !== PRODUCT_EVENT)
    return
  const { name, price, emoji, desc } = body.params ?? {}
  if (!name || !price)
    return
  const productToSet: LiveProduct = {
    name,
    price: Number(price) || 0,
    emoji: emoji || '🛍️',
    desc: desc || undefined,
  }
  void setAttributes({ 'live:product': JSON.stringify(productToSet) }).catch(() => {})
  signalLogs.value = [...signalLogs.value.slice(-4), `📦 商品指令：${name} ¥${productToSet.price}`]
}

/** 信令房状态（joined/failed/kicked/destroyed，不拖累 UI 房） */
function handleSignalStatus(payload: SignalStatusPayload) {
  signalStatus.value = payload.status
  signalStatusKind.value = payload.status === 'joined' ? 'ok' : 'err'
  if (payload.status === 'joined') {
    signalLogs.value = [...signalLogs.value.slice(-4), `🔗 信令房已接入：${payload.roomId.slice(0, 8)}…`]
  }
  else if (payload.status === 'failed' || payload.status === 'kicked' || payload.status === 'destroyed') {
    signalLogs.value = [...signalLogs.value.slice(-4), `⚠️ 信令房 ${payload.status}（UI 房不受影响）`]
  }
}

/** 进入直播：UI 房 + 可选信令房 */
function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  joinError.value = ''
  signalStatus.value = signalRoomInput.value.trim() ? '接入中…' : '未启用'
  signalLogs.value = []
  activeRoomId.value = id
}

function handleExit() {
  activeRoomId.value = ''
  joinError.value = ''
}

function handleJoinError(error: unknown) {
  joinError.value = (error as Error).message || '加入失败'
}

/** 容器 signal-rooms：数组存在即多房（无布尔开关）；信令房默认不拉历史 */
const signalRooms = computed(() => {
  const id = signalRoomInput.value.trim()
  return id ? [{ roomId: id, pullHistory: false, autoRejoin: true }] : []
})
</script>

<template>
  <div class="live-page">
    <DemoSceneHeader title="私域直播">
      <span>{{ activeRoomId ? '直播中' : '未开播' }}</span>
    </DemoSceneHeader>

    <!-- 开播入口：UI 房 + 信令房 ID -->
    <div v-if="!activeRoomId" class="live-page__entry">
      <div class="live-page__entry-card">
        <div class="live-page__entry-title">
          🎥 开启直播
        </div>
        <div class="live-page__entry-desc">
          私域直播双房架构：UI 房（弹幕/礼物）+ 信令房（商品指令，低量高可达）。
          两个 ID 用不同聊天室；信令房留空则退回单房形态。
        </div>
        <input
          v-model="roomIdInput"
          class="live-page__input"
          type="text"
          placeholder="UI 房聊天室 ID（弹幕/礼物）"
        >
        <input
          v-model="signalRoomInput"
          class="live-page__input"
          type="text"
          placeholder="信令房聊天室 ID（商品指令，可稍后填）"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="live-page__error">
          {{ joinError }}
        </div>
        <button class="live-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          开播
        </button>
      </div>
    </div>

    <!-- 直播间（live preset + 商品卡 toolbar + 信令房双房） -->
    <EmChatroomContainer
      v-else
      class="live-page__container"
      :room-id="activeRoomId"
      scene="live"
      :signal-rooms="signalRooms"
      @back="handleExit"
      @kicked="handleExit"
      @destroyed="handleExit"
      @join-error="handleJoinError"
      @signal-message="handleSignalMessage"
      @signal-status="handleSignalStatus"
    >
      <!-- toolbar 插槽：商品卡片 + 信令房指令面板 -->
      <template #toolbar>
        <DemoLiveProductCard :product="product" />
        <div class="live-page__signal">
          <div class="live-page__signal-head">
            <span class="live-page__signal-label">信令房</span>
            <span
              class="live-page__signal-status"
              :class="`live-page__signal-status--${signalStatusKind}`"
            >
              {{ signalStatus }}
            </span>
            <button class="live-page__publish" :disabled="!signalRoomInput.trim()" @click="handlePublishProduct">
              上架商品
            </button>
          </div>
          <div v-if="signalLogs.length > 0" class="live-page__signal-logs">
            <div v-for="(log, index) in signalLogs" :key="index" class="live-page__signal-log">
              {{ log }}
            </div>
          </div>
        </div>
      </template>
    </EmChatroomContainer>
  </div>
</template>

<style scoped>
.live-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--uikit-bg-base, #fff);
}

.live-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.live-page__entry-card {
  width: 100%;
  max-width: 320px;
  padding: 24px 20px;
  border-radius: 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  background: var(--uikit-bg-elevated, #fff);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.live-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.live-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.live-page__input:focus {
  border-color: var(--uikit-primary-color);
}

.live-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.live-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.live-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.live-page__container {
  flex: 1;
  min-height: 0;
}

.live-page__signal {
  flex-shrink: 0;
  padding: 6px 12px 8px;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base, #fff));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

.live-page__signal-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-page__signal-label {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--uikit-bg-active, rgba(51, 177, 255, 0.1));
  color: var(--uikit-primary-color);
}

.live-page__signal-status {
  font-size: 11px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

.live-page__signal-status--ok {
  color: #16a34a;
}

.live-page__signal-status--err {
  color: var(--uikit-danger-color, #e5484d);
}

.live-page__publish {
  margin-left: auto;
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-danger-color, #e5484d);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.live-page__publish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.live-page__signal-logs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.live-page__signal-log {
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
