<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveInteractiveCard, ChatroomLiveOverlayManager } from '@easemob/uikit-chatroom'
import type { LiveOverlayItem } from '@easemob/uikit-chatroom'

const items = ref<LiveOverlayItem[]>([])
let seq = 0

function pushProduct() {
  items.value = [...items.value, { id: ++seq, anchor: 'bottom-right', meta: { title: `限时 5 折 #${seq}` } }]
}

function pushNotice() {
  items.value = [...items.value, { id: ++seq, anchor: 'top', meta: { text: `公告：今晚 20:00 准时开播 #${seq}` } }]
}

function removeItem(id: string | number) {
  items.value = items.value.filter(i => i.id !== id)
}
</script>

<template>
  <div class="om-demo">
    <div class="om-demo__ops">
      <button type="button" @click="pushNotice">
        推顶部公告
      </button>
      <button type="button" @click="pushProduct">
        推右下商品卡
      </button>
    </div>
    <div class="om-demo__stage">
      <ChatroomLiveOverlayManager :items="items">
        <template #item="{ item, close }">
          <!-- top 锚点：公告条 -->
          <div v-if="item.anchor === 'top'" class="om-demo__notice" @click="close">
            📢 {{ (item.meta as any)?.text }}
          </div>
          <!-- bottom-right 锚点：交互卡片堆叠 -->
          <ChatroomLiveInteractiveCard v-else :active="true" @close="() => close()">
            <template #title>
              <b>{{ (item.meta as any)?.title }}</b>
            </template>
            <div class="om-demo__sku">
              🛍️
            </div>
            <template #footer="{ action }">
              <button class="om-demo__buy" type="button" @click="action">
                立即抢购
              </button>
            </template>
          </ChatroomLiveInteractiveCard>
        </template>
      </ChatroomLiveOverlayManager>
    </div>
    <p class="hint">
      同一锚点多条自动堆叠不重叠（bottom-right）；顶部公告与右下卡片互不干扰。
    </p>
  </div>
</template>

<style scoped>
.om-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.om-demo__ops {
  display: flex;
  gap: 8px;
}

.om-demo__ops button {
  padding: 4px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.om-demo__stage {
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(180deg, #1c2333, #14181f);
}

.om-demo__notice {
  margin: 8px;
  padding: 6px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.om-demo__sku {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  font-size: 28px;
}

.om-demo__buy {
  padding: 3px 12px;
  border: none;
  border-radius: 12px;
  background: #ff4d4f;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
