<script setup lang="ts">
/**
 * 直播商品卡片（私域直播页）：商品状态存房间属性 `live:product`（JSON），
 * 全房间实时同步（四层属性同步）；「上架商品」走信令房 custom 指令 →
 * 业务经 signal-message 回调解析 → 写属性 → 卡片刷新。
 * 链路演示：信令房（低量高可达指令）与 UI 房（弹幕/礼物）分工，符合 §5.9。
 */
import { computed } from 'vue'
import { useToast } from '@easemob/uikit-core'

export interface LiveProduct {
  /** 商品名 */
  name: string
  /** 价格（元） */
  price: number
  /** 展示 emoji */
  emoji: string
  /** 描述 */
  desc?: string
}

const props = defineProps<{
  /** 当前商品（无商品时渲染空态） */
  product: LiveProduct | null
  /** 叠加形态（直播画面场景）：半透明深色浮层，画面透出 */
  overlay?: boolean
}>()

const toast = useToast()

const display = computed(() => props.product)

function handleBuy() {
  if (!display.value)
    return
  toast.success(`已跳转下单：${display.value.name}（演示）`)
}
</script>

<template>
  <div class="live-product" :class="{ 'live-product--overlay': overlay }">
    <!-- 空态：暂无商品 -->
    <div v-if="!display" class="live-product__empty">
      <span class="live-product__empty-icon">🛍️</span>
      <span class="live-product__empty-text">暂无在售商品——主播可点下方「上架商品」</span>
    </div>

    <!-- 商品卡 -->
    <div v-else class="live-product__card">
      <span class="live-product__emoji">{{ display.emoji }}</span>
      <div class="live-product__body">
        <div class="live-product__name">
          {{ display.name }}
        </div>
        <div v-if="display.desc" class="live-product__desc">
          {{ display.desc }}
        </div>
        <div class="live-product__price">
          ¥{{ display.price.toFixed(2) }}
        </div>
      </div>
      <button class="live-product__buy" @click="handleBuy">
        购买
      </button>
    </div>
  </div>
</template>

<style scoped>
.live-product {
  flex-shrink: 0;
  padding: 8px 12px;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base, #fff));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
}

/* 叠加形态：半透明深色浮层（直播画面场景，画面透出；文字反白） */
.live-product--overlay {
  background: rgba(17, 24, 39, 0.45);
  border-bottom: none;
  backdrop-filter: blur(4px);
}

.live-product--overlay .live-product__name {
  color: #fff;
}

.live-product--overlay .live-product__desc {
  color: rgba(255, 255, 255, 0.7);
}

.live-product--overlay .live-product__price {
  color: #ff6b6b;
}

.live-product--overlay .live-product__empty-text {
  color: rgba(255, 255, 255, 0.6);
}

.live-product__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 0;
  font-size: 12px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

.live-product__empty-icon {
  font-size: 18px;
}

.live-product__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(51, 177, 255, 0.08), rgba(243, 200, 80, 0.08));
  border: 1px solid rgba(51, 177, 255, 0.18);
}

.live-product__emoji {
  font-size: 30px;
  flex-shrink: 0;
}

.live-product__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.live-product__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-product__desc {
  font-size: 11px;
  color: var(--uikit-text-secondary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-product__price {
  font-size: 15px;
  font-weight: 700;
  color: var(--uikit-danger-color, #e5484d);
}

.live-product__buy {
  flex-shrink: 0;
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.live-product__buy:active {
  opacity: 0.85;
}
</style>
