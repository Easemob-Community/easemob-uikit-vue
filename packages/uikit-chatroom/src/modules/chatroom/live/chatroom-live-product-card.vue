<script setup lang="ts">
/**
 * 直播商品讲解卡片（右中区，距顶部 40%，宽 130px，P4 review UI 规范）：
 * - 外框 2px 白边 + 圆角 12px，白底；「讲解中」红底白字标签 + 金色呼吸灯边框动画；
 * - 结构：✕ 讲解中 1/1 / 商品图（cover）/ 把握机会 数量有限 / 已抢光遮罩 /
 *   会员福利 ¥价格 [抢]（红渐变白粗体）；
 * - 交互：点击跳转商品详情（click）；右上角关闭向右滑出消失（close）；
 *   「抢」按钮（buy）。
 */
import { ref } from 'vue'
import { t } from '@easemob/uikit-core'

export interface LiveProduct {
  /** 商品名 */
  name: string
  /** 价格（元） */
  price: number
  /** 展示 emoji（demo 商品图占位；真实接入用图片 URL） */
  emoji: string
  /** 描述 */
  desc?: string
}

withDefaults(defineProps<{
  /** 当前商品（null = 不渲染卡片） */
  product: LiveProduct | null
  /** 讲解中（金色呼吸灯边框） */
  explaining?: boolean
  /** 已抢光（灰色遮罩） */
  soldOut?: boolean
  /** 讲解序号（「讲解中 1/1」右侧） */
  position?: string
}>(), {
  explaining: true,
  soldOut: false,
  position: '1/1',
})

const emit = defineEmits<{
  /** 点击卡片（跳转商品详情） */
  (e: 'click', product: LiveProduct): void
  /** 关闭（向右滑出消失） */
  (e: 'close'): void
  /** 抢购按钮 */
  (e: 'buy', product: LiveProduct): void
}>()

/** 关闭动画状态（true = 滑出中，结束后 emit close 由父级移除） */
const closing = ref(false)
const CLOSE_MS = 400

function handleClose() {
  if (closing.value)
    return
  closing.value = true
  setTimeout(() => {
    emit('close')
    closing.value = false
  }, CLOSE_MS)
}
</script>

<template>
  <div
    v-if="product"
    class="live-product-card"
    :class="{ 'live-product-card--explaining': explaining, 'live-product-card--closing': closing }"
    @click="emit('click', product)"
  >
    <!-- 头部：关闭 + 讲解中标签 -->
    <div class="live-product-card__head">
      <span class="live-product-card__close" @click.stop="handleClose">
        ✕
      </span>
      <span v-if="explaining" class="live-product-card__tag">
        {{ t('chatroom.ui.liveExplaining') }} {{ position }}
      </span>
    </div>

    <!-- 商品图（demo 用 emoji 占位；真实接入替换 img） -->
    <div class="live-product-card__image">
      <img v-if="product.emoji.startsWith('http')" :src="product.emoji" :alt="product.name">
      <span v-else class="live-product-card__image-emoji">{{ product.emoji }}</span>
      <!-- 已抢光遮罩 -->
      <div v-if="soldOut" class="live-product-card__soldout">
        — {{ t('chatroom.ui.liveSoldOut') }} —
      </div>
    </div>

    <!-- 商品文案 -->
    <div class="live-product-card__copy">
      <div>{{ t('chatroom.ui.liveGrabChance') }}</div>
      <div class="live-product-card__limited">
        {{ t('chatroom.ui.liveLimited') }}
      </div>
    </div>

    <!-- 底部：会员福利 + 价格 + 抢 -->
    <div class="live-product-card__footer">
      <span class="live-product-card__benefit">{{ t('chatroom.ui.liveMemberBenefit') }}</span>
      <span class="live-product-card__price">¥{{ product.price.toFixed(2) }}</span>
      <button class="live-product-card__grab" @click.stop="emit('buy', product)">
        {{ t('chatroom.ui.liveGrab') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.live-product-card {
  position: relative;
  width: 130px;
  padding: 8px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition:
    transform 400ms ease-out,
    opacity 400ms ease-out;
  will-change: transform, opacity;
}

/* 讲解中：金色呼吸灯边框动画 */
.live-product-card--explaining {
  animation: explain-breath 2s ease-in-out infinite;
}

@keyframes explain-breath {
  0%,
  100% {
    box-shadow:
      0 0 0 2px rgba(243, 200, 80, 0.9),
      0 4px 16px rgba(0, 0, 0, 0.25);
  }
  50% {
    box-shadow:
      0 0 0 4px rgba(243, 200, 80, 0.35),
      0 4px 16px rgba(0, 0, 0, 0.25);
  }
}

/* 关闭：向右滑出消失 */
.live-product-card--closing {
  transform: translateX(120%);
  opacity: 0;
}

.live-product-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.live-product-card__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 10px;
  line-height: 1;
}

.live-product-card__tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: #e5484d;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.live-product-card__image {
  position: relative;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #fde68a, #fca5a5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.live-product-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.live-product-card__image-emoji {
  font-size: 42px;
}

.live-product-card__soldout {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107, 114, 128, 0.55);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.live-product-card__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #111827;
  margin-bottom: 8px;
}

.live-product-card__limited {
  color: #6b7280;
  font-size: 11px;
}

.live-product-card__footer {
  display: flex;
  align-items: center;
  gap: 4px;
}

.live-product-card__benefit {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(229, 72, 77, 0.1);
  color: #e5484d;
  white-space: nowrap;
}

.live-product-card__price {
  font-size: 13px;
  font-weight: 700;
  color: #e5484d;
  white-space: nowrap;
}

.live-product-card__grab {
  margin-left: auto;
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 4px 0 0 4px;
  background: linear-gradient(90deg, #e5484d, #ff6b6b);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
</style>
