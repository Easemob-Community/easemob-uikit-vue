<script setup lang="ts">
/**
 * PC 私域直播开播端页（P5 PC 模式验收页）：EmChatroomContainer + split 三栏——
 * 舞台区 #stage（模拟直播画面 + 商品卡 overlay）+ 消息主栏 + 成员常驻侧栏
 * （行悬停快捷管理 + 点击/右键上下文菜单），管理位走 #manage-actions 插槽。
 *
 * 业务角色示范（demo-role.ts）：主播（落 owner）/ 场控（落 admin）/ 观众（落 member）
 * 切换只改变业务层视角；真实操作权限以服务端权限为准（角色与权限不一致时
 * 管理 UI 不出现、操作被服务端拒绝兜底）。
 *
 * 双房链路复用：上架商品指令发信令房 → signal-message → 写 live_product 属性 →
 * 舞台商品卡全房间刷新。
 */
import { computed, ref, watch } from 'vue'
import {
  ChatroomLiveInteractiveCard,
  EmChatroomContainer,
  useChatroomAttributes,
  useChatroomMember,
  useChatroomMessage,
} from '@easemob/uikit-chatroom'
import type { SignalMessagePayload, SignalStatusPayload } from '@easemob/uikit-chatroom'
import { t, useToast } from '@easemob/uikit-core'
import DemoSceneHeader from '../components/demo-scene-header.vue'
import { LIVE_ROLES, useDemoRole } from '../demo-role'
import type { DemoPlayerRole } from '../demo-role'

const DEFAULT_ROOM_ID = '315874547400706'
/** 信令房默认 ID（用户提供的联调信令房）；可改，清空退回单房形态 */
const DEFAULT_SIGNAL_ROOM_ID = '315874557886465'

interface LiveProduct {
  name: string
  price: number
  imageUrl?: string
  emoji?: string
  tag?: string
}

const roomIdInput = ref(DEFAULT_ROOM_ID)
const signalRoomInput = ref(DEFAULT_SIGNAL_ROOM_ID)
const activeRoomId = ref('')
const joinError = ref('')

const toast = useToast()
/** 业务角色抽象（主播/场控/观众；demo 层示范，UIKit 不感知） */
const demoRole = useDemoRole('anchor', { roles: LIVE_ROLES })
/** 真实房间权限（服务端；用于演示「角色 vs 权限」的映射关系） */
const { currentRole } = useChatroomMember()
const { attributes, setAttributes, removeAttributes } = useChatroomAttributes()
const { sendCustom } = useChatroomMessage()

/* ===== 商品（live_product 属性 + 信令指令驱动，复用直播页双房链路） ===== */

const product = computed<LiveProduct | null>(() => {
  const raw = attributes.value.live_product
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as Partial<LiveProduct>
    if (typeof parsed.name !== 'string' || typeof parsed.price !== 'number')
      return null
    return { name: parsed.name, price: parsed.price, imageUrl: parsed.imageUrl, emoji: parsed.emoji ?? '🛍️', tag: parsed.tag }
  }
  catch {
    return null
  }
})

const DEMO_PRODUCTS: LiveProduct[] = [
  { name: '会员福利 1', price: 9.9, imageUrl: 'https://picsum.photos/id/225/300/300', emoji: '🍷', tag: '会员福利1' },
  { name: '夏日限定 T 恤', price: 89, imageUrl: 'https://picsum.photos/id/152/300/300', emoji: '👕', tag: '会员福利2' },
  { name: '无线蓝牙耳机', price: 199, imageUrl: 'https://picsum.photos/id/157/300/300', emoji: '🎧', tag: '会员福利3' },
]
let productIndex = 0

const PRODUCT_EVENT = 'live:product'

/** 上架商品：本地立即写属性（商品卡弹出）+ 信令房指令跨端同步（§5.9） */
async function handlePublishProduct() {
  const signalRoomId = signalRoomInput.value.trim()
  if (!signalRoomId) {
    toast.error('请先填写信令房 ID（商品指令走信令房通道）')
    return
  }
  const next = DEMO_PRODUCTS[productIndex % DEMO_PRODUCTS.length]!
  productIndex += 1
  try {
    void setAttributes({ live_product: JSON.stringify(next) }).catch(() => {})
    await sendProductSignal(next, signalRoomId)
    toast.success(`已上架：${next.name}`)
  }
  catch {
    toast.error('指令发送失败（信令房未加入？）')
  }
}

/** 清空商品（下架） */
function handleClearProduct() {
  void removeAttributes(['live_product']).catch(() => {})
}

/** 信令房商品指令（页面显式按房发送；容器 signal-rooms 负责订阅） */
async function sendProductSignal(productData: LiveProduct, roomId: string) {
  await sendCustom(PRODUCT_EVENT, {
    name: productData.name,
    price: String(productData.price),
    imageUrl: productData.imageUrl ?? '',
    emoji: productData.emoji ?? '🛍️',
    tag: productData.tag ?? '',
  }, { roomId })
}

/** 信令房消息透传：商品指令 → 写 live_product 属性（跨端同步） */
function handleSignalMessage(payload: SignalMessagePayload) {
  const body = payload.message.body as { event?: string, params?: Record<string, string> }
  if (body.event !== PRODUCT_EVENT)
    return
  const { name, price, imageUrl, emoji, tag } = body.params ?? {}
  if (!name || !price)
    return
  void setAttributes({
    live_product: JSON.stringify({
      name,
      price: Number(price) || 0,
      imageUrl: imageUrl || undefined,
      emoji: emoji || '🛍️',
      tag: tag || undefined,
    }),
  }).catch(() => {})
}

const signalStatus = ref('未启用')
const signalStatusKind = ref<'idle' | 'ok' | 'err'>('idle')

function handleSignalStatus(payload: SignalStatusPayload) {
  signalStatus.value = payload.status
  signalStatusKind.value = payload.status === 'joined' ? 'ok' : 'err'
}

/** 信令房订阅配置（容器负责 join/leave；留空退单房） */
const signalRooms = computed(() => {
  const id = signalRoomInput.value.trim()
  return id ? [{ roomId: id, pullHistory: false, autoRejoin: true }] : undefined
})

/* ===== 房间生命周期 ===== */

function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  joinError.value = ''
  signalStatus.value = signalRoomInput.value.trim() ? '接入中…' : '未启用'
  activeRoomId.value = id
}

function handleExit() {
  activeRoomId.value = ''
  joinError.value = ''
}

function handleJoinError(error: unknown) {
  joinError.value = (error as Error).message || '加入失败'
}

/** 场景：live preset + split 三栏 + 成员常驻侧栏 + PC 输入条多行（P5） */
const pcLiveScene = {
  name: 'live',
  layout: 'split' as const,
  features: {
    memberList: 'panel' as const,
    multilineInput: true,
  },
  panels: { memberWidth: 300 },
}

/** 权限提示（角色预期 vs 实际账号权限） */
const permissionHint = computed(() => {
  const expected = demoRole.expectedPermission.value
  const actual = currentRole.value
  if (actual === expected)
    return `角色「${demoRole.label.value}」与账号权限一致（${actual}）`
  return `角色「${demoRole.label.value}」预期 ${expected}，当前账号为 ${actual}——管理位将按实际权限显示`
})

/** 角色切换后提醒（演示：切换只改业务视角） */
watch(() => demoRole.role.value, () => {
  toast.show(`已切换为「${demoRole.label.value}」视角（真实权限仍以登录账号为准）`, 'info')
})
</script>

<template>
  <div class="pc-live-page">
    <DemoSceneHeader title="PC 私域直播（开播端）">
      <span>{{ activeRoomId ? '直播中' : '未开播' }}</span>
      <span v-if="activeRoomId" class="pc-live-page__signal" :class="`pc-live-page__signal--${signalStatusKind}`">
        信令房 {{ signalStatus }}
      </span>
    </DemoSceneHeader>

    <!-- 开播入口 -->
    <div v-if="!activeRoomId" class="pc-live-page__entry">
      <div class="pc-live-page__entry-card">
        <div class="pc-live-page__entry-title">
          🎥 开启直播（PC 开播端）
        </div>
        <div class="pc-live-page__entry-desc">
          split 三栏：舞台区（视频/商品）+ 消息主栏 + 成员常驻侧栏（悬停管理 /
          右键菜单）；上架商品走信令房双房链路。业务角色（主播/场控/观众）切换
          只改视角，真实权限以登录账号为准。
        </div>
        <input
          v-model="roomIdInput"
          class="pc-live-page__input"
          type="text"
          placeholder="UI 房聊天室 ID（弹幕/消息）"
        >
        <input
          v-model="signalRoomInput"
          class="pc-live-page__input"
          type="text"
          placeholder="信令房聊天室 ID（商品指令，可稍后填）"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="pc-live-page__error">
          加入失败：{{ joinError }}
        </div>
        <button class="pc-live-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          开播
        </button>
      </div>
    </div>

    <!-- 开播中：split 三栏容器 -->
    <EmChatroomContainer
      v-else
      class="pc-live-page__container"
      :room-id="activeRoomId"
      :scene="pcLiveScene"
      :signal-rooms="signalRooms"
      @signal-message="handleSignalMessage"
      @signal-status="handleSignalStatus"
      @back="handleExit"
      @kicked="handleExit"
      @destroyed="handleExit"
      @join-error="handleJoinError"
    >
      <!-- 舞台区：模拟直播画面 + 商品卡 overlay -->
      <template #stage>
        <div class="pc-live-stage">
          <div class="pc-live-stage__video">
            <span class="pc-live-stage__hint">🎥 直播画面（模拟）——接入真实播放器后，overlay 叠加在此</span>
          </div>
          <!-- 商品卡（InteractiveCard 壳子，内容业务定义） -->
          <div v-if="product" class="pc-live-stage__product">
            <ChatroomLiveInteractiveCard :active="true" :closable="true" @close="handleClearProduct" @action="toast.success(`跳转商品详情：${product?.name}（演示）`)">
              <template #title>
                <span class="pc-live-stage__product-tag">讲解中</span>
              </template>
              <div class="pc-live-stage__product-body">
                <img
                  v-if="product.imageUrl"
                  :src="product.imageUrl"
                  :alt="product.name"
                  class="pc-live-stage__product-img"
                >
                <span v-else class="pc-live-stage__product-emoji">{{ product.emoji }}</span>
              </div>
              <template #footer>
                <span v-if="product.tag" class="pc-live-stage__product-tag-name">{{ product.tag }}</span>
                <span class="pc-live-stage__product-price">¥{{ product.price.toFixed(2) }}</span>
                <button class="pc-live-stage__product-grab" @click.stop="toast.success(`购买：${product?.name}（演示）`)">
                  抢
                </button>
              </template>
            </ChatroomLiveInteractiveCard>
          </div>
        </div>
      </template>

      <!-- 管理位操作条（容器按 canManage 门控；内容按业务角色视角显示） -->
      <template #manage-actions>
        <div class="pc-live-page__manage">
          <template v-if="demoRole.showManage">
            <button class="pc-live-page__manage-btn" @click="handlePublishProduct">
              📦 上架商品
            </button>
            <button v-if="product" class="pc-live-page__manage-btn" @click="handleClearProduct">
              下架商品
            </button>
            <span class="pc-live-page__manage-hint">{{ permissionHint }}</span>
          </template>
          <span v-else class="pc-live-page__manage-hint">
            {{ demoRole.label }} 视角：管理入口由业务角色层隐藏（真实权限仍为 {{ currentRole }}）
          </span>
        </div>
      </template>

      <!-- 角色切换器（业务角色抽象示范） -->
      <template #header-extra>
        <select
          class="pc-live-page__role-select"
          :value="demoRole.role"
          @change="demoRole.setRole(($event.target as HTMLSelectElement).value as DemoPlayerRole)"
        >
          <option v-for="r in demoRole.roles" :key="r" :value="r">
            {{ r === 'anchor' ? '主播' : r === 'assistant' ? '场控' : '观众' }}
          </option>
        </select>
        <span class="pc-live-page__role-hint">{{ t('chatroom.ui.roleOwner') }}/{{ t('chatroom.ui.roleAdmin') }}: {{ currentRole }}</span>
      </template>
    </EmChatroomContainer>
  </div>
</template>

<style scoped>
.pc-live-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--uikit-bg-base, #fff);
}

.pc-live-page__container {
  flex: 1;
  min-height: 0;
}

.pc-live-page__signal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.05));
}

.pc-live-page__signal--ok {
  color: #22c55e;
}

.pc-live-page__signal--err {
  color: #ef4444;
}

/* ===== 开播入口 ===== */
.pc-live-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.pc-live-page__entry-card {
  width: 100%;
  max-width: 420px;
  padding: 24px 20px;
  border-radius: 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  background: var(--uikit-bg-elevated, #fff);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-live-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.pc-live-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.pc-live-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.pc-live-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.pc-live-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.pc-live-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 舞台区（split #stage 插槽内容） ===== */
.pc-live-stage {
  position: absolute;
  inset: 0;
}

.pc-live-stage__video {
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

.pc-live-stage__hint {
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.55);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.pc-live-stage__product {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 220px;
}

.pc-live-stage__product-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #e5484d;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

.pc-live-stage__product-body {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #fde68a, #fca5a5);
}

.pc-live-stage__product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-live-stage__product-emoji {
  font-size: 42px;
}

.pc-live-stage__product-tag-name {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(229, 72, 77, 0.1);
  color: #e5484d;
}

.pc-live-stage__product-price {
  font-size: 15px;
  font-weight: 700;
  color: #e5484d;
}

.pc-live-stage__product-grab {
  margin-left: auto;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: linear-gradient(90deg, #e5484d, #ff6b6b);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* ===== 管理位操作条（#manage-actions 插槽内容） ===== */
.pc-live-page__manage {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pc-live-page__manage-btn {
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 13px;
  cursor: pointer;
}

.pc-live-page__manage-hint {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
}

/* ===== 角色切换器（header-extra） ===== */
.pc-live-page__role-select {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  font-size: 12px;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
}

.pc-live-page__role-hint {
  font-size: 11px;
  color: var(--uikit-text-tertiary, #9ca3af);
}
</style>
