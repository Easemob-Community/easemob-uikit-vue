<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomLiveTopBar } from '@easemob/uikit-chatroom'

const shared = ref(false)
</script>

<template>
  <div class="top-bar-demo">
    <ChatroomLiveTopBar title="会员年中福利" heat="1.4万">
      <!-- #extra：更多 / 投诉按钮之后的业务动作区 -->
      <template #extra>
        <button class="share" type="button" @click="shared = true">
          分享
        </button>
      </template>
    </ChatroomLiveTopBar>
    <p v-if="shared" class="tip">
      ✅ 已触发分享动作（演示 `#extra` 插槽）
    </p>
  </div>
</template>

<style scoped>
.top-bar-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.share {
  padding: 2px 10px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.tip {
  margin: 0;
  font-size: 13px;
}
</style>
