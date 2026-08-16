<script setup lang="ts">
/**
 * 私域直播页（P4 review UI 规范重构）：视频画面上四层绝对定位 overlay——
 * 顶层（顶部信息栏/抽奖入口）+ 左下区（弹幕流：上部通知区 + 下部聊天区）+
 * 右中区（商品讲解卡片）+ 底部（快捷输入区）。全部 UI 为包内直播组件集
 * （ChatroomLive*），内核走 headless 契约（useChatroom + useChatroomMessage
 * subscribe + member-joined），不经过 EmChatroomContainer。
 *
 * 双房链路保留：商品指令/签到指令发信令房 → signal-message 回调 →
 * 写 live_product 属性 / push 弹幕。
 */
import { computed, ref, watch } from 'vue'
import {
  CHATROOM_GIFT_EVENT,
  CHATROOM_GIFT_ITEMS,
  ChatroomLiveDanmakuStream,
  ChatroomLiveFullscreenEffect,
  ChatroomLiveInputBar,
  ChatroomLiveInteractiveCard,
  ChatroomLiveLotteryEntry,
  ChatroomLiveOverlayManager,
  ChatroomLiveTopBar,
  getChatroomPopupTarget,
  useChatroom,
  useChatroomAttributes,
  useChatroomMessage,
} from '@easemob/uikit-chatroom'
import type {
  LiveDanmakuItem,
  LiveDanmakuStreamProps,
  LiveFullscreenEffectItem,
  LiveOverlayItem,
  MemberJoinedPayload,
  SignalMessagePayload,
  SignalStatusPayload,
} from '@easemob/uikit-chatroom'
import { EmPopup, MESSAGE_TYPE, t, useToast } from '@easemob/uikit-core'
import DemoSceneHeader from '../components/demo-scene-header.vue'

const DEFAULT_ROOM_ID = '315874547400706'
/** 信令房默认 ID（用户提供的联调信令房）；可改，清空退回单房形态 */
const DEFAULT_SIGNAL_ROOM_ID = '315874557886465'

/** Demo 侧商品数据契约（UIKIT 只提供 InteractiveCard 壳子，内容由业务定义） */
interface LiveProduct {
  name: string
  price: number
  imageUrl?: string
  emoji?: string
  tag?: string
  desc?: string
}

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
const { attributes, setAttributes, removeAttributes } = useChatroomAttributes()

/* ===== 商品（live_product 属性 + 信令指令驱动） ===== */

/** 当前商品（属性 JSON 解析；缺失/损坏回落 null） */
const product = computed<LiveProduct | null>(() => {
  const raw = attributes.value['live_product']
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as Partial<LiveProduct>
    if (typeof parsed.name !== 'string' || typeof parsed.price !== 'number')
      return null
    return {
      name: parsed.name,
      price: parsed.price,
      imageUrl: parsed.imageUrl,
      emoji: parsed.emoji ?? '🛍️',
      desc: parsed.desc,
      tag: parsed.tag,
    }
  }
  catch {
    return null
  }
})

/** 商品讲解状态（模拟：上架即讲解中；抢购完售罄） */
const productExplaining = ref(true)
const productSoldOut = ref(false)

/** 右下 overlay 交互卡片列表（商品、红包、优惠券等由业务自行入队） */
const overlayItems = ref<LiveOverlayItem[]>([])

watch(
  () => product.value,
  (prod) => {
    if (!prod) {
      overlayItems.value = overlayItems.value.filter(item => item.id !== 'product')
      return
    }
    const existing = overlayItems.value.find(item => item.id === 'product')
    if (existing) {
      existing.meta = { product: prod }
      return
    }
    overlayItems.value.push({
      id: 'product',
      anchor: 'bottom-right',
      priority: 10,
      meta: { product: prod },
    })
  },
  { immediate: true },
)

/** 模拟弹出一个红包卡（演示多容器自动排位） */
function pushRedEnvelope() {
  const id = `red-envelope-${Date.now()}`
  overlayItems.value.push({
    id,
    anchor: 'bottom-right',
    priority: 5,
    meta: { type: 'red-envelope', amount: (1 + Math.random() * 10).toFixed(2) },
  })
  // 5 秒后自动消失
  setTimeout(() => {
    overlayItems.value = overlayItems.value.filter(item => item.id !== id)
  }, 5000)
}

/** 移除 overlay 条目 */
function handleOverlayRemove(id: string | number) {
  if (id === 'product') {
    handleProductClose()
    return
  }
  overlayItems.value = overlayItems.value.filter(item => item.id !== id)
}

/** 模拟商品清单（演示「上架商品」循环，带参考图风格商品图与标签） */
const DEMO_PRODUCTS: LiveProduct[] = [
  {
    name: '会员福利 1',
    price: 9.9,
    imageUrl: 'https://picsum.photos/id/225/300/300',
    emoji: '🍷',
    tag: '会员福利1',
  },
  {
    name: '夏日限定 T 恤',
    price: 89,
    imageUrl: 'https://picsum.photos/id/152/300/300',
    emoji: '👕',
    tag: '会员福利2',
  },
  {
    name: '无线蓝牙耳机',
    price: 199,
    imageUrl: 'https://picsum.photos/id/157/300/300',
    emoji: '🎧',
    tag: '会员福利3',
  },
  {
    name: '手冲咖啡礼盒',
    price: 129,
    imageUrl: 'https://picsum.photos/id/425/300/300',
    emoji: '☕',
    tag: '会员福利4',
  },
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
    // 本地立即写属性：商品卡立即弹出；信令消息用于跨端同步
    void setAttributes({
      'live_product': JSON.stringify({
        name: next.name,
        price: next.price,
        imageUrl: next.imageUrl,
        emoji: next.emoji ?? '🛍️',
        tag: next.tag,
        desc: next.desc,
      }),
    }).catch(() => {})
    await sendCustom(PRODUCT_EVENT, {
      name: next.name,
      price: String(next.price),
      imageUrl: next.imageUrl ?? '',
      emoji: next.emoji ?? '🛍️',
      tag: next.tag ?? '',
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

/** 信令房消息透传：商品指令 → 写 live_product 属性；签到指令 → checkin 弹幕 */
function handleSignalMessage(payload: SignalMessagePayload) {
  const body = payload.message.body as { event?: string, params?: Record<string, string> }
  if (body.event === PRODUCT_EVENT) {
    const { name, price, imageUrl, emoji, tag, desc } = body.params ?? {}
    if (!name || !price)
      return
    void setAttributes({ 'live_product': JSON.stringify({
      name,
      price: Number(price) || 0,
      imageUrl: imageUrl || undefined,
      emoji: emoji || '🛍️',
      tag: tag || undefined,
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

/** 商品卡交互（product 从闭包取，UIKIT 壳子不绑定业务数据） */
function handleProductBuy() {
  if (productSoldOut.value) {
    toast.error('已抢光啦，下次早点来~')
    return
  }
  if (!product.value)
    return
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
  void removeAttributes(['live_product']).catch(() => {})
}

function handleProductClick() {
  if (!product.value)
    return
  toast.success(`跳转商品详情：${product.value.name}（演示）`)
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

/** 成员加入 → 推入弹幕通知区（welcome 类型，VIP 高亮） */
subscribeMemberJoined((payload: MemberJoinedPayload) => {
  for (const member of payload.members) {
    const isVip = payload.ext === '1' || Math.random() < 0.2
    pushDanmaku({
      kind: 'welcome',
      name: member.nickname || member.userId,
      content: '进入',
      isVip,
    })
  }
})

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

/** 礼物面板显隐 */
const showGiftPanel = ref(false)
/** 全屏动效队列 */
const fullscreenEffects = ref<LiveFullscreenEffectItem[]>([])
let fullscreenSeq = 0

const GIFT_NAME_KEYS: Record<string, string> = {
  flower: 'chatroom.ui.giftNameFlower',
  like: 'chatroom.ui.giftNameLike',
  rocket: 'chatroom.ui.giftNameRocket',
  car: 'chatroom.ui.giftNameCar',
}

/** 礼物：发送并关闭面板；大礼物触发全屏动效 */
function handleGiftClick(giftId: string, icon: string) {
  if (!isJoined.value)
    return
  const giftName = t(GIFT_NAME_KEYS[giftId] ?? giftId, giftId)
  void sendCustom(CHATROOM_GIFT_EVENT, { giftId, giftName, icon }).catch(() => {})
  showGiftPanel.value = false
  // 火箭/跑车触发全屏动效
  if (giftId === 'rocket' || giftId === 'car') {
    fullscreenSeq += 1
    fullscreenEffects.value.push({
      id: fullscreenSeq,
      type: giftId,
      icon,
      name: '神秘大哥',
      text: `送出 ${giftName}`,
      duration: 3500,
    })
  }
}

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

/** 用户名脱敏开关（演示弹幕组件 mask-name prop） */
const maskName = ref(true)
/** 弹幕气泡圆角预设（演示弹幕组件 shape prop） */
const danmakuShape = ref<NonNullable<LiveDanmakuStreamProps['shape']>>('rounded')
const DANMAKU_SHAPE_LABELS = { rounded: '圆角', pill: '大圆角', square: '方圆角' } as const
function cycleDanmakuShape() {
  danmakuShape.value = danmakuShape.value === 'rounded' ? 'pill' : danmakuShape.value === 'pill' ? 'square' : 'rounded'
}
/** 弹幕最大展示行数（演示弹幕组件 max-lines prop，如防诈提醒类长文案可放大） */
const danmakuMaxLines = ref(2)
/** 弹幕字号档位（演示弹幕组件 size prop：小/中/大） */
const danmakuSize = ref<LiveDanmakuStreamProps['size']>('small')
const DANMAKU_SIZE_LABELS = { small: '小', medium: '中', large: '大' } as const
function cycleDanmakuSize() {
  danmakuSize.value = danmakuSize.value === 'small' ? 'medium' : danmakuSize.value === 'medium' ? 'large' : 'small'
}
/** 弹幕主题（演示 --live-danmaku-* CSS 变量覆盖：默认 / 暖橙品牌色） */
const danmakuTheme = ref<'default' | 'warm'>('default')
const danmakuThemeVars = computed(() =>
  danmakuTheme.value === 'warm'
    ? {
        '--live-danmaku-bg': 'rgba(194, 65, 12, 0.45)',
        '--live-danmaku-normal-name-color': '#ffedd5',
        '--live-danmaku-checkin-bg': 'linear-gradient(90deg, #7c3aed, #a78bfa)',
        '--live-danmaku-purchase-bg': 'rgba(124, 58, 237, 0.9)',
      }
    : {},
)

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

      <!-- 右中区：overlay 布局管理器（自动排位商品卡/红包卡等交互卡片） -->
      <ChatroomLiveOverlayManager
        class="live-stage__overlay"
        :items="overlayItems"
        @remove="handleOverlayRemove"
      >
        <template #item="{ item, close }">
          <!-- 商品卡 -->
          <ChatroomLiveInteractiveCard
            v-if="item.id === 'product'"
            :active="productExplaining"
            :sold-out="productSoldOut"
            :closable="true"
            :auto-close-ms="30000"
            @click="handleProductClick"
            @close="close"
            @action="handleProductBuy"
          >
            <template #title>
              <span class="demo-product-card__tag">讲解中 1/1</span>
            </template>

            <div class="demo-product-card__image">
              <img
                v-if="(item.meta?.product as LiveProduct | undefined)?.imageUrl"
                :src="(item.meta?.product as LiveProduct).imageUrl"
                :alt="(item.meta?.product as LiveProduct).name"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              >
              <span v-else class="demo-product-card__emoji">{{ (item.meta?.product as LiveProduct | undefined)?.emoji ?? '🛍️' }}</span>
            </div>
            <div class="demo-product-card__copy">
              <div class="demo-product-card__chance">
                把握机会
              </div>
              <div class="demo-product-card__limited">
                数量有限
              </div>
            </div>

            <template #footer>
              <span v-if="(item.meta?.product as LiveProduct | undefined)?.tag" class="demo-product-card__tag-name">{{ (item.meta?.product as LiveProduct).tag }}</span>
              <span class="demo-product-card__price">¥{{ ((item.meta?.product as LiveProduct | undefined)?.price ?? 0).toFixed(2) }}</span>
              <button class="demo-product-card__grab" @click.stop="handleProductBuy">
                抢
              </button>
            </template>
          </ChatroomLiveInteractiveCard>

          <!-- 红包卡（演示多容器自动排位） -->
          <ChatroomLiveInteractiveCard
            v-else-if="item.meta?.type === 'red-envelope'"
            :active="true"
            @close="close"
            @action="close"
          >
            <template #title>
              <span class="demo-red-envelope__tag">直播间红包</span>
            </template>
            <div class="demo-red-envelope__body">
              <span class="demo-red-envelope__icon">🧧</span>
              <span class="demo-red-envelope__amount">¥{{ item.meta.amount }}</span>
            </div>
            <template #footer>
              <button class="demo-red-envelope__grab" @click.stop="close">
                立即领取
              </button>
            </template>
          </ChatroomLiveInteractiveCard>
        </template>
      </ChatroomLiveOverlayManager>

      <!-- 左下区：弹幕流（上部通知区 + 下部聊天区） -->
      <div class="live-stage__danmaku" :style="danmakuThemeVars">
        <ChatroomLiveDanmakuStream :items="danmakuItems" :mask-name="maskName" :shape="danmakuShape" :max-lines="danmakuMaxLines" :size="danmakuSize" />
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
            <button class="live-stage__signal-btn" @click="pushRedEnvelope">
              弹个红包
            </button>
            <button class="live-stage__signal-btn" @click="maskName = !maskName">
              脱敏：{{ maskName ? '开' : '关' }}
            </button>
          </div>
          <div class="live-stage__signal-row">
            <button class="live-stage__signal-btn" @click="cycleDanmakuShape">
              气泡：{{ DANMAKU_SHAPE_LABELS[danmakuShape] }}
            </button>
            <button class="live-stage__signal-btn" @click="danmakuMaxLines = danmakuMaxLines === 2 ? 4 : 2">
              行数：{{ danmakuMaxLines }}
            </button>
            <button class="live-stage__signal-btn" @click="cycleDanmakuSize">
              字号：{{ DANMAKU_SIZE_LABELS[danmakuSize ?? 'small'] }}
            </button>
            <button class="live-stage__signal-btn" @click="danmakuTheme = danmakuTheme === 'default' ? 'warm' : 'default'">
              主题：{{ danmakuTheme === 'warm' ? '暖橙' : '默认' }}
            </button>
          </div>
          <div class="live-stage__signal-row">
            <button class="live-stage__signal-btn live-stage__signal-btn--exit" @click="handleExit">
              退出直播
            </button>
          </div>
        </div>
      </div>

      <!-- 全屏动效层：火箭/跑车等大礼物 -->
      <ChatroomLiveFullscreenEffect :items="fullscreenEffects" @end="(id) => fullscreenEffects = fullscreenEffects.filter(item => item.id !== id)">
        <template #default="{ item }">
          <div class="demo-fs-effect" :class="`demo-fs-effect--${item.type}`">
            <span class="demo-fs-effect__icon">{{ item.icon }}</span>
            <div class="demo-fs-effect__text">
              <div class="demo-fs-effect__name">{{ item.name }}</div>
              <div class="demo-fs-effect__desc">{{ item.text }}</div>
            </div>
          </div>
        </template>
      </ChatroomLiveFullscreenEffect>

      <!-- 底部：快捷输入区（通用 InputBar + 业务方 slot 组合动作） -->
      <ChatroomLiveInputBar
        class="live-stage__input"
        :quick-phrases="QUICK_PHRASES"
        :disabled="!isJoined"
        :send-interval-ms="800"
        :block-words="['脏话', '广告']"
        @send="handleSendText"
        @block="(_text, reason) => toast.error(reason)"
        @send-too-fast="(remaining) => toast.warning(`请 ${Math.ceil(remaining / 1000)}s 后再发`)"
      >
        <template #actions="{ canSend, send }">
          <!-- 礼物 -->
          <button
            class="live-input-bar__action live-input-bar__gift"
            :disabled="!isJoined"
            @click="showGiftPanel = !showGiftPanel"
          >
            <span class="live-input-bar__gift-icon">🎁</span>
            <span class="live-input-bar__badge">1</span>
          </button>

          <!-- 菜单 -->
          <button
            class="live-input-bar__action live-input-bar__menu"
            :disabled="!isJoined"
            @click="toast.success('菜单（演示）')"
          >
            ▦
          </button>

          <!-- 分享 -->
          <button
            class="live-input-bar__action live-input-bar__share"
            :disabled="!isJoined"
            @click="toast.success('分享（演示）')"
          >
            ↗
          </button>

          <!-- 点赞 -->
          <button
            class="live-input-bar__action live-input-bar__like"
            :disabled="!isJoined"
            @click="handleLike"
          >
            <span class="live-input-bar__like-icon">❤️</span>
            <span v-if="likeCountText" class="live-input-bar__like-count">{{ likeCountText }}</span>
          </button>
        </template>

        <template #panels>
          <!-- 礼物面板 -->
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
                  :disabled="!isJoined"
                  @click="handleGiftClick(gift.giftId, gift.icon)"
                >
                  <span class="live-input-bar__gift-item-icon">{{ gift.icon }}</span>
                  <span class="live-input-bar__gift-item-name">{{ t(GIFT_NAME_KEYS[gift.giftId] ?? gift.giftId, gift.giftId) }}</span>
                </button>
              </div>
            </div>
          </EmPopup>
        </template>
      </ChatroomLiveInputBar>
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

/* 右中区：overlay 布局管理器（覆盖直播舞台，内部自动排位） */
.live-stage__overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

/* 左下区：欢迎横幅 + 弹幕流
   弹幕流容器必须给出「定宽」（width: 70% 对定宽舞台解析），不能用 max-width 只做上限：
   abs 只设 left 时宽度为 shrink-to-fit（不定宽），后代百分比 max-width 会循环依赖，
   导致弹幕气泡可用宽度被算窄、短消息异常逐字换行。 */
.live-stage__danmaku {
  position: absolute;
  left: 8px;
  bottom: 108px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  width: 70%;
  max-width: 280px;
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

/* ===== Demo 商品卡内容样式（基于 ChatroomLiveInteractiveCard 壳子） ===== */
.demo-product-card__tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #e5484d;
  color: #fff;
  font-size: clamp(9px, 2.4vw, 10px);
  font-weight: 600;
  white-space: nowrap;
}

.demo-product-card__image {
  position: relative;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #fde68a, #fca5a5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-product-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.demo-product-card__emoji {
  font-size: 42px;
}

.demo-product-card__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}

.demo-product-card__chance {
  font-size: clamp(11px, 2.9vw, 12px);
  font-weight: 600;
  color: #111827;
}

.demo-product-card__limited {
  font-size: clamp(10px, 2.6vw, 11px);
  color: #6b7280;
}

.demo-product-card__tag-name {
  font-size: clamp(9px, 2.3vw, 10px);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(229, 72, 77, 0.1);
  color: #e5484d;
  white-space: nowrap;
}

.demo-product-card__price {
  font-size: clamp(13px, 3.4vw, 15px);
  font-weight: 700;
  color: #e5484d;
  white-space: nowrap;
}

.demo-product-card__grab {
  margin-left: auto;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: linear-gradient(90deg, #e5484d, #ff6b6b);
  color: #fff;
  font-size: clamp(12px, 3.2vw, 13px);
  font-weight: 700;
  cursor: pointer;
}

/* ===== Demo 红包卡内容样式 ===== */
.demo-red-envelope__tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #e5484d;
  color: #fff;
  font-size: clamp(9px, 2.4vw, 10px);
  font-weight: 600;
  white-space: nowrap;
}

.demo-red-envelope__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 80px;
  border-radius: 8px;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
}

.demo-red-envelope__icon {
  font-size: 32px;
}

.demo-red-envelope__amount {
  font-size: clamp(16px, 4vw, 18px);
  font-weight: 700;
  color: #e5484d;
}

.demo-red-envelope__grab {
  width: 100%;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: linear-gradient(90deg, #e5484d, #ff6b6b);
  color: #fff;
  font-size: clamp(11px, 3vw, 12px);
  font-weight: 600;
  cursor: pointer;
}

/* ===== Demo 直播间输入条动作按钮样式 ===== */
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

/* ===== Demo 全屏动效内容样式 ===== */
.demo-fs-effect {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: #fff;
}

.demo-fs-effect__icon {
  font-size: clamp(100px, 28vw, 200px);
  line-height: 1;
  filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.5));
  animation: demo-fs-bounce 1s ease-in-out infinite;
}

@keyframes demo-fs-bounce {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.1) translateY(-20px);
  }
}

.demo-fs-effect__text {
  padding: 12px 32px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(229, 72, 77, 0.85), rgba(243, 200, 80, 0.85));
  box-shadow: 0 4px 20px rgba(229, 72, 77, 0.4);
}

.demo-fs-effect__name {
  font-size: clamp(18px, 5vw, 28px);
  font-weight: 700;
  color: #ffefb8;
}

.demo-fs-effect__desc {
  font-size: clamp(14px, 4vw, 22px);
  font-weight: 600;
}
</style>
