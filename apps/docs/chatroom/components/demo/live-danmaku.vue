<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { ChatroomLiveDanmakuStream } from '@easemob/uikit-chatroom'
import type { LiveDanmakuItem } from '@easemob/uikit-chatroom'

const items = ref<LiveDanmakuItem[]>([])
let seq = 0
let timer: ReturnType<typeof setInterval> | undefined

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
const COMMENTS = ['主播好棒！', '这个商品不错', '哈哈哈', '666', '来了来了', '蹲一个优惠']

function push(item: Omit<LiveDanmakuItem, 'id'>) {
  items.value = [...items.value, { ...item, id: ++seq }]
  // 简单封顶，防止无限增长
  if (items.value.length > 30)
    items.value = items.value.slice(-30)
}

/** 随机推送一条弹幕（普通 / 礼物 / 签到 / 购买 / 欢迎） */
function pushRandom() {
  const roll = Math.random()
  const name = NAMES[Math.floor(Math.random() * NAMES.length)]
  if (roll < 0.4) {
    push({ kind: 'normal', name, content: COMMENTS[Math.floor(Math.random() * COMMENTS.length)] })
  }
  else if (roll < 0.6) {
    push({ kind: 'gift', name, content: '送出礼物', giftIcon: '🎁', count: Math.ceil(Math.random() * 3) })
  }
  else if (roll < 0.75) {
    push({ kind: 'checkin', name, content: '签到成功' })
  }
  else if (roll < 0.9) {
    push({ kind: 'purchase', name, content: '购买了商品', count: Math.ceil(Math.random() * 5) })
  }
  else {
    push({
      kind: 'welcome',
      name: '新用户',
      content: '进入直播间',
      isVip: true,
      meta: { vipLevel: Math.ceil(Math.random() * 8) },
    })
  }
}

// 自动推送，模拟直播间刷屏
timer = setInterval(pushRandom, 1200)

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="danmaku-demo">
    <div class="danmaku-demo__toolbar">
      <button type="button" @click="pushRandom">
        推送一条
      </button>
    </div>
    <ChatroomLiveDanmakuStream
      :items="items"
      shape="pill"
      class="danmaku-demo__stream"
    >
      <template #prefix="{ item }">
        <span v-if="(item.meta as any)?.vipLevel" class="danmaku-demo__crown">👑</span>
      </template>
      <template #badge="{ item }">
        <span v-if="(item.meta as any)?.vipLevel" class="danmaku-demo__badge">
          L{{ (item.meta as any).vipLevel }}
        </span>
      </template>
    </ChatroomLiveDanmakuStream>
  </div>
</template>

<style scoped>
.danmaku-demo__toolbar {
  margin-bottom: 8px;
}

.danmaku-demo__toolbar button {
  padding: 4px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.danmaku-demo__stream {
  height: 240px;
  padding: 12px;
  overflow: hidden;
  border-radius: 10px;
  background: #14181f;
}

.danmaku-demo__crown {
  margin-right: 4px;
}

.danmaku-demo__badge {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 8px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  vertical-align: 1px;
}
</style>
