<script setup lang="ts">
import { ref } from 'vue'

const width = ref(320)
</script>

<template>
  <div class="resizable-demo">
    <em-resizable
      v-model="width"
      axis="horizontal"
      :min="240"
      :max="480"
      class="resizable-demo__panel"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="resizable-demo__item"
      >
        <span class="resizable-demo__avatar" />
        <div class="resizable-demo__meta">
          <div class="resizable-demo__name">会话 {{ i }}</div>
          <div class="resizable-demo__preview">拖拽右缘调整面板宽度</div>
        </div>
      </div>
    </em-resizable>
    <div class="resizable-demo__info">
      当前宽度：{{ width }}px（240 ~ 480）
    </div>
  </div>
</template>

<style scoped>
.resizable-demo__panel {
  height: 220px;
  overflow: hidden;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--uikit-bg-color, #fff);
}

.resizable-demo__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--uikit-border-light, #f3f4f6);
}

.resizable-demo__avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--uikit-primary-light, #e8f3ff);
}

.resizable-demo__meta {
  min-width: 0;
  flex: 1;
}

.resizable-demo__name {
  font-size: 14px;
  color: var(--uikit-text-primary, #1f2937);
}

.resizable-demo__preview {
  margin-top: 2px;
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resizable-demo__info {
  margin-top: 8px;
  font-size: 13px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
