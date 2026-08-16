<script setup lang="ts">
import { ref } from 'vue'
import { ChatroomSplitLayout } from '@easemob/uikit-chatroom'

const memberWidth = ref(180)
</script>

<template>
  <div class="sl-demo">
    <ChatroomSplitLayout :member-width="memberWidth" :show-members="true">
      <template #stage>
        <div class="sl-demo__stage">
          舞台区（视频 / 白板）
        </div>
      </template>
      <div class="sl-demo__chat">
        <p>消息主栏</p>
        <p>拖动右侧分隔条可调整成员栏宽度（200~480px 的容器内演示值）</p>
      </div>
      <template #members>
        <div class="sl-demo__members">
          成员侧栏
        </div>
      </template>
    </ChatroomSplitLayout>
    <p class="sl-demo__hint">
      三栏布局壳：`#stage` + 默认插槽（消息主栏）+ `#members`；成员栏宽度可拖拽。
      容器 `layout: 'split'` 时内部即使用本组件。
    </p>
  </div>
</template>

<style scoped>
.sl-demo__stage,
.sl-demo__chat,
.sl-demo__members {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  font-size: 13px;
  text-align: center;
}

.sl-demo__stage {
  background: #1c2333;
  color: rgba(255, 255, 255, 0.6);
}

.sl-demo__chat {
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.sl-demo__chat p {
  margin: 2px 0;
}

.sl-demo__members {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.sl-demo__hint {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
