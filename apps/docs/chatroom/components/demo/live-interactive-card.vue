<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveInteractiveCard } from '@easemob/uikit-chatroom'

const soldOut = ref(false)
const closed = ref(false)
const log = ref('')

function buy() {
  soldOut.value = true
  log.value = '✅ 触发 action 事件（立即抢购）→ 已抢光遮罩'
}

function close() {
  closed.value = true
  log.value = '已触发 close 事件（关闭滑出动画）'
}

function reset() {
  soldOut.value = false
  closed.value = false
  log.value = ''
}
</script>

<template>
  <div class="card-demo">
    <ChatroomLiveInteractiveCard
      v-if="!closed"
      :active="true"
      :sold-out="soldOut"
      sold-out-text="已抢光"
      @action="buy"
      @close="close"
    >
      <template #title>
        <b>限时 5 折</b>
      </template>
      <div class="sku">
        🛍️ 商品图占位
      </div>
      <template #footer="{ action }">
        <button class="buy" type="button" :disabled="soldOut" @click="action">
          {{ soldOut ? '已抢光' : '立即抢购' }}
        </button>
      </template>
    </ChatroomLiveInteractiveCard>

    <p v-if="!closed && !soldOut" class="hint">
      金色呼吸灯边框 = active 态；点「立即抢购」触发 action 事件并进入已抢光遮罩
    </p>

    <div class="ops">
      <button type="button" @click="reset">
        重置
      </button>
    </div>

    <p v-if="log" class="log">
      {{ log }}
    </p>
  </div>
</template>

<style scoped>
.card-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.sku {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.buy {
  padding: 4px 14px;
  border: none;
  border-radius: 14px;
  background: #ff4d4f;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.buy:disabled {
  background: #999;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.ops button {
  padding: 3px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
}

.log {
  margin: 0;
  font-size: 13px;
}
</style>
