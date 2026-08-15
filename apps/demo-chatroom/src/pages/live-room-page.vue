<script setup lang="ts">
/**
 * 私域直播页（P4 review UI 规范重构）：视频画面上四层绝对定位 overlay——
 * 顶层（顶部信息栏/抽奖入口）+ 左下区（欢迎横幅 + 弹幕流）+ 右中区
 * （商品讲解卡片）+ 底部（快捷输入区）。全部 UI 为包内直播组件集
 * （ChatroomLive*），内核走 headless 契约（useChatroom + useChatroomMessage
 * subscribe + member-joined），不经过 EmChatroomContainer。
 *
 * 双房链路保留：商品指令/签到指令发信令房 → signal-message 回调 →
 * 写 live:product 属性 / push 弹幕。
 */
import { computed, ref } from 'vue'
import {
  CHATROOM_GIFT_EVENT,
  ChatroomLiveDanmakuStream,
  ChatroomLiveInputBar,
  ChatroomLiveLotteryEntry,
  ChatroomLiveProductCard,
  ChatroomLiveTopBar,
  ChatroomLiveWelcomeBanner,
  useChatroom,
  useChatroomAttributes,
  useChatroomMessage,
} from '@easemob/uikit-chatroom'
import type {
  LiveDanmakuItem,
  LiveProduct,
  MemberJoinedPayload,
  SignalMessagePayload,
  SignalStatusPayload,
} from '@easemob/uikit-chatroom'
import { MESSAGE_TYPE, useToast } from '@easemob/uikit-core'
import DemoSceneHeader from '../components/demo-scene-header.vue'

const DEFAULT_ROOM_ID = '315874547400706'
/** 信令房默认 ID（用户提供的联调信令房）；可改，清空退回单房形态 */
const DEFAULT_SIGNAL_ROOM_ID = '315874557886465'

const roomIdInput = ref(DEFAULT_ROOM_ID)
/** 信令房 ID：默认填入联调信令房；清空 = 单房形态 */
const signalRoomInput = ref(DEFAULT_SIGNAL_ROOM_ID)
const activeRoomId = ref('')
const joinError = ref('')

const toast = useToast()
const {
  isJoined,
  join,
  leave,
  joinSignalRoom,
  leaveSignalRoom,
  subscribeMemberJoined,
  subscribeSignalMessages,
  subscribeSignalStatus,
} = useChatroom()
const { subscribe, sendText, sendCustom } = useChatroomMessage()
const { attributes, setAttributes } = useChatroomAttributes()

/* ===== 商品（live:product 属性 + 信令指令驱动） ===== */

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

/** 商品讲解状态（模拟：上架即讲解中；抢购完售罄） */
const productExplaining = ref(true)
const productSoldOut = ref(false)

/** 模拟商品清单（演示「上架商品」循环） */
const DEMO_PRODUCTS: LiveProduct[] = [
  { name: '夏日限定 T 恤', price: 89, emoji: '👕', desc: '纯棉透气，直播间专享价' },
  { name: '无线蓝牙耳机', price: 199, emoji: '🎧', desc: '主动降噪，续航 30h' },
  { name: '手冲咖啡礼盒', price: 129, emoji: '☕', desc: '精选豆 + 手冲壶套装' },
  { name: '机械键盘 87 键', price: 299, emoji: '⌨️', desc: '茶轴热插拔，RGB 背光' },
]
let productIndex = 0

/** 商品指令事件名（信令房 custom 消息） */
const PRODUCT_EVENT = 'live:product'
/** 签到指令事件名（信令房 custom 消息，低量高可达指令通道演示） */
const CHECKIN_EVENT = 'live:checkin'

/** 上架商品：指令发往信令房（sendCustom 显式 roomId，§5.9 按房发送实证） */
async function handlePublishProduct() {
  const signalRoomId = signalRoomInput.value.trim()
  if (!signalRoomId) {
    toast.error('请先填写信令房 ID（商品指令走信令房通道）')
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
    productExplaining.value = true
    productSoldOut.value = false
    pushDanmaku({ kind: 'checkin', name: '系统', content: `📦 新商品上架：${next.name}` })
  }
  catch {
    toast.error('指令发送失败（信令房未加入？）')
  }
}

/** 信令房消息透传：商品指令 → 写 live:product 属性；签到指令 → checkin 弹幕 */
function handleSignalMessage(payload: SignalMessagePayload) {
  const body = payload.message.body as { event?: string, params?: Record<string, string> }
  if (body.event === PRODUCT_EVENT) {
    const { name, price, emoji, desc } = body.params ?? {}
    if (!name || !price)
      return
    void setAttributes({ 'live:product': JSON.stringify({
      name,
      price: Number(price) || 0,
      emoji: emoji || '🛍️',
      desc: desc || undefined,
    }) }).catch(() => {})
    productExplaining.value = true
    productSoldOut.value = false
  }
  else if (body.event === CHECKIN_EVENT) {
    // 签到系统消息（红色渐变胶囊）
    pushDanmaku({ kind: 'checkin', name: '系统', content: '签到力泉会员活动！！' })
  }
}

/** 商品卡交互 */
function handleProductBuy(_product: LiveProduct) {
  if (productSoldOut.value) {
    toast.error('已抢光啦，下次早点来~')
    return
  }
  // 购买提示弹幕（脱敏用户名 + 随机人数合并）
  pushDanmaku({
    kind: 'purchase',
    name: '朱长士',
    content: '正在去购买',
    count: 1 + Math.floor(Math.random() * 5),
  })
  productSoldOut.value = true
}

function handleProductClose() {
  void setAttributes({ 'live:product': '' }).catch(() => {})
}

function handleProductClick(prod: LiveProduct) {
  toast.success(`跳转商品详情：${prod.name}（演示）`)
}

/* ===== 弹幕流（headless subscribe 驱动） ===== */

const danmakuItems = ref<LiveDanmakuItem[]>([])
let danmakuSeq = 0

function pushDanmaku(item: Omit<LiveDanmakuItem, 'id'>) {
  danmakuSeq += 1
  danmakuItems.value = [...danmakuItems.value, { ...item, id: danmakuSeq }]
}

/** 消息增量订阅：按类型分流到弹幕（普通/礼物） */
subscribe((batch) => {
  for (const msg of batch) {
    const from = msg.from || '游客'
    if (msg.type === MESSAGE_TYPE.TEXT) {
      pushDanmaku({ kind: 'normal', name: from, content: (msg.body as { content?: string }).content ?? '' })
      continue
    }
    if (msg.type === MESSAGE_TYPE.CUSTOM) {
      const body = msg.body as { event?: string, params?: Record<string, string> }
      if (body.event === CHATROOM_GIFT_EVENT) {
        pushDanmaku({
          kind: 'gift',
          name: from,
          content: `送出 ${body.params?.giftName ?? '礼物'}`,
          giftIcon: body.params?.icon ?? '🎁',
        })
      }
    }
  }
})

/** 成员加入 → 欢迎横幅（VIP 判定：ext 透传 '1' 或随机模拟） */
const welcomeShow = ref(false)
const welcomeName = ref('')
const welcomeVip = ref(false)
let welcomeQueue: Array<{ name: string, vip: boolean }> = []
let welcomeBusy = false

function showNextWelcome() {
  if (welcomeBusy || welcomeQueue.length === 0)
    return
  welcomeBusy = true
  const next = welcomeQueue.shift()!
  welcomeName.value = next.name
  welcomeVip.value = next.vip
  welcomeShow.value = true
}

subscribeMemberJoined((payload: MemberJoinedPayload) => {
  for (const member of payload.members) {
    welcomeQueue.push({
      name: member.nickname || member.userId,
      vip: payload.ext === '1' || Math.random() < 0.2,
    })
  }
  showNextWelcome()
})

function handleWelcomeHidden() {
  welcomeShow.value = false
  welcomeBusy = false
  showNextWelcome()
}

/* ===== 底部输入区 ===== */

const QUICK_PHRASES = ['欢迎新来的小伙伴~', '主播真棒！', '666', '链接在哪里？']
const likeCount = ref(0)
const likeCountText = computed(() => {
  if (likeCount.value === 0)
    return ''
  if (likeCount.value >= 10000)
    return `${(likeCount.value / 10000).toFixed(1)}w`
  return String(likeCount.value)
})

function handleSendText(content: string) {
  void sendText(content).catch(() => {
    toast.error('发送失败')
  })
}

function handleLike() {
  likeCount.value += 1
}

/* ===== 信令房状态 ===== */

const signalStatus = ref('未启用')
const signalStatusKind = ref<'idle' | 'ok' | 'err'>('idle')
const signalPanelOpen = ref(false)

function handleSignalStatus(payload: SignalStatusPayload) {
  signalStatus.value = payload.status
  signalStatusKind.value = payload.status === 'joined' ? 'ok' : 'err'
}

/** 签到指令（信令房通道演示）：发 custom 到信令房 → signal-message → checkin 弹幕 */
async function handleCheckin() {
  const signalRoomId = signalRoomInput.value.trim()
  if (!signalRoomId) {
    toast.error('请先填写信令房 ID（签到指令走信令房通道）')
    return
  }
  try {
    await sendCustom(CHECKIN_EVENT, {}, { roomId: signalRoomId })
  }
  catch {
    toast.error('签到指令发送失败')
  }
}

/* ===== 信令房订阅接线（页面不经容器，显式订阅） ===== */
subscribeSignalMessages(handleSignalMessage)
subscribeSignalStatus(handleSignalStatus)

/* ===== 房间生命周期 ===== */

function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  joinError.value = ''
  signalStatus.value = signalRoomInput.value.trim() ? '接入中…' : '未启用'
  danmakuItems.value = []
  likeCount.value = 0
  welcomeQueue = []
  const signalRoomId = signalRoomInput.value.trim()
  if (signalRoomId) {
    // 信令房并行入房（leaveOtherRooms: false 由 joinSignalRoom 内部保证）
    void joinSignalRoom(signalRoomId, { pullHistory: false, autoRejoin: true }).catch(() => {
      // 失败已降级为 signal-status
    })
  }
  void join(id, JSON.stringify({ source: 'live-page' })).catch((error: unknown) => {
    joinError.value = (error as Error).message || '加入失败'
  }).then(() => {
    if (isJoined.value)
      activeRoomId.value = id
  })
}

function handleExit() {
  const signalRoomId = signalRoomInput.value.trim()
  if (signalRoomId)
    void leaveSignalRoom(signalRoomId).catch(() => {})
  void leave().then(() => {
    activeRoomId.value = ''
    joinError.value = ''
  })
}
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
          私域直播双房架构：UI 房（弹幕/礼物）+ 信令房（商品/签到指令，低量高可达）。
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
          placeholder="信令房聊天室 ID（商品/签到指令，可稍后填）"
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

    <!-- 直播间：视频画面上四层绝对定位 overlay（P4 review UI 规范） -->
    <div v-else class="live-stage">
      <!-- 底层：视频画面（模拟；真实接入替换为业务播放器） -->
      <div class="live-stage__video">
        <div class="live-stage__video-hint">
          🎥 直播画面（模拟）——接入真实播放器后，overlay 组件将叠加在此画面上
        </div>
      </div>

      <!-- 顶层：顶部信息栏（红色渐变横幅） -->
      <ChatroomLiveTopBar
        class="live-stage__top"
        title="会员年中福利"
        heat="1.4万"
        @more="toast.success('更多（演示）')"
        @report="toast.success('投诉（演示）')"
      />

      <!-- 顶层：评论抽奖入口（右侧顶部偏下） -->
      <ChatroomLiveLotteryEntry class="live-stage__lottery" @click="toast.success('评论抽奖（演示）')" />

      <!-- 右中区：商品讲解卡片（距顶部 40%） -->
      <ChatroomLiveProductCard
        class="live-stage__product"
        :product="product"
        :explaining="productExplaining"
        :sold-out="productSoldOut"
        @click="handleProductClick"
        @close="handleProductClose"
        @buy="handleProductBuy"
      />

      <!-- 左下区：欢迎横幅 + 弹幕流 -->
      <div class="live-stage__danmaku">
        <ChatroomLiveWelcomeBanner
          :show="welcomeShow"
          :name="welcomeName"
          :is-vip="welcomeVip"
          @hidden="handleWelcomeHidden"
        />
        <ChatroomLiveDanmakuStream :items="danmakuItems" />
      </div>

      <!-- 信令房悬浮面板（右下角，可折叠） -->
      <div class="live-stage__signal">
        <button class="live-stage__signal-toggle" @click="signalPanelOpen = !signalPanelOpen">
          <span class="live-stage__signal-dot" :class="`live-stage__signal-dot--${signalStatusKind}`" />
          {{ signalPanelOpen ? '信令房 ▾' : '信令房 ▴' }}
        </button>
        <div v-if="signalPanelOpen" class="live-stage__signal-panel">
          <div class="live-stage__signal-row">
            <span>状态：{{ signalStatus }}</span>
          </div>
          <div class="live-stage__signal-row">
            <button class="live-stage__signal-btn" @click="handlePublishProduct">
              上架商品
            </button>
            <button class="live-stage__signal-btn" @click="handleCheckin">
              模拟签到
            </button>
          </div>
          <div class="live-stage__signal-row">
            <button class="live-stage__signal-btn live-stage__signal-btn--exit" @click="handleExit">
              退出直播
            </button>
          </div>
        </div>
      </div>

      <!-- 底部：快捷输入区 -->
      <ChatroomLiveInputBar
        class="live-stage__input"
        :quick-phrases="QUICK_PHRASES"
        :like-count="likeCountText"
        :disabled="!isJoined"
        @send="handleSendText"
        @like="handleLike"
        @menu="toast.success('菜单（演示）')"
        @share="toast.success('分享（演示）')"
      />
    </div>
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

/* ===== 开播入口 ===== */
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

/* ===== 直播间舞台：四层绝对定位 ===== */
.live-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #000;
}

/* 底层：视频画面（模拟） */
.live-stage__video {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(51, 177, 255, 0.35), transparent 55%),
    radial-gradient(ellipse at 70% 80%, rgba(243, 200, 80, 0.25), transparent 50%),
    linear-gradient(160deg, #1e3a5f 0%, #101828 55%, #0b1120 100%);
}

.live-stage__video-hint {
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.55);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

/* 顶层：顶部信息栏 */
.live-stage__top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

/* 顶层：评论抽奖入口（右侧顶部偏下） */
.live-stage__lottery {
  position: absolute;
  top: 62px;
  right: 8px;
  z-index: 10;
}

/* 右中区：商品讲解卡片（距顶部 40%） */
.live-stage__product {
  position: absolute;
  top: 40%;
  right: 8px;
  z-index: 10;
}

/* 左下区：欢迎横幅 + 弹幕流 */
.live-stage__danmaku {
  position: absolute;
  left: 8px;
  bottom: 108px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  max-width: 70%;
}

/* 信令房悬浮面板（右下角） */
.live-stage__signal {
  position: absolute;
  right: 8px;
  bottom: 108px;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.live-stage__signal-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.55);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.live-stage__signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}

.live-stage__signal-dot--ok {
  background: #22c55e;
}

.live-stage__signal-dot--err {
  background: #ef4444;
}

.live-stage__signal-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.65);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
}

.live-stage__signal-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.live-stage__signal-btn {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.live-stage__signal-btn--exit {
  background: rgba(229, 72, 77, 0.85);
}

/* 底部：快捷输入区 */
.live-stage__input {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
}
</style>
