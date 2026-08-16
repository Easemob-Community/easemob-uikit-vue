<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveInputBar } from '@easemob/uikit-chatroom'

const sent = ref<string[]>([])

function sendText(text: string) {
  sent.value = [text, ...sent.value].slice(0, 5)
}
</script>

<template>
  <div class="input-demo">
    <ChatroomLiveInputBar
      :quick-phrases="['666', '主播好棒']"
      :block-words="['脏话']"
      @send="sendText"
    >
      <!-- 右侧动作区（scope：text / send / can-send） -->
      <template #actions="{ send, canSend }">
        <button class="action" type="button" :disabled="!canSend" @click="send()">
          🎁
        </button>
      </template>
    </ChatroomLiveInputBar>
    <ul v-if="sent.length" class="sent">
      <li v-for="(t, i) in sent" :key="i">
        {{ t }}
      </li>
    </ul>
    <p v-else class="hint">
      输入文字回车发送（演示发送回显；含快捷短语与敏感词拦截）
    </p>
  </div>
</template>

<style scoped>
.input-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}

.action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sent {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sent li {
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
  font-size: 13px;
}

.hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
