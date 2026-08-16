<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveInteractiveCard } from '@easemob/uikit-chatroom'

const active = ref(true)
const soldOut = ref(false)
const log = ref('')

function buy() {
  soldOut.value = true
  log.value = '✅ 已触发 action 事件（立即抢购）'
}

function close() {
  active.value = false
  log.value = '已关闭卡片（close 事件）'
}

function reset() {
  active.value = true
  soldOut.value = false
  log.value = ''
}
</script>

<template>
  <div class="card-demo">
    <ChatroomLiveInteractiveCard
      v-if="active"
      :active="!soldOut"
      :sold-out="soldOut"
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
        <button class="buy" type="button" @click="action">
          立即抢购
        </button>
      </template>
    </ChatroomLiveInteractiveCard>

    <p v-if="log" class="log">
      {{ log }} <a href="#" @click.prevent="reset">重置</a>
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

.log {
  margin: 0;
  font-size: 13px;
}
</style>
