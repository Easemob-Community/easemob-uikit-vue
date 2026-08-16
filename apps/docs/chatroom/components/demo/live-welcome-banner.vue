<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveWelcomeBanner } from '@easemob/uikit-chatroom'

const show = ref(false)
const name = ref('E***')
const isVip = ref(true)

/** 模拟成员进场：show=true 触发入场；组件退场完成派发 hidden，这里复位以便再次触发 */
function welcome() {
  name.value = 'E***'
  isVip.value = Math.random() > 0.4
  show.value = true
}

function onHidden() {
  show.value = false
}
</script>

<template>
  <div class="wb-demo">
    <button type="button" @click="welcome">
      模拟成员进场
    </button>
    <div class="wb-demo__stage">
      <ChatroomLiveWelcomeBanner
        :show="show"
        :name="name"
        :is-vip="isVip"
        @hidden="onHidden"
      />
      <span class="wb-demo__placeholder">弹幕区（横幅在此上方居中滑入）</span>
    </div>
    <p class="hint">
      入场从左侧滑入（400ms），显示 3 秒后自动收起；VIP 用户带 👑 皇冠 + 用户名高亮。
      退场完成派发 <code>hidden</code> 事件，可反复触发。
    </p>
  </div>
</template>

<style scoped>
.wb-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.wb-demo button {
  padding: 4px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.wb-demo__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 120px;
  overflow: hidden;
  border-radius: 10px;
  background: #14181f;
}

.wb-demo__placeholder {
  margin: auto;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
}

.hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
