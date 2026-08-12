<script setup lang="ts">
import { ref } from 'vue'

const height = ref(120)
</script>

<template>
  <div class="resizable-demo">
    <em-resizable
      v-model="height"
      axis="vertical"
      :min="80"
      :max="240"
      class="resizable-demo__panel"
    >
      <textarea
        class="resizable-demo__textarea"
        placeholder="拖拽下缘手柄调整输入区高度…"
      />
    </em-resizable>
    <div class="resizable-demo__info">
      当前高度：{{ height }}px（80 ~ 240）
    </div>
  </div>
</template>

<style scoped>
.resizable-demo__panel {
  width: 420px;
  max-width: 100%;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--uikit-bg-color, #fff);
}

.resizable-demo__textarea {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--uikit-text-primary, #1f2937);
  background: transparent;
}

.resizable-demo__textarea::placeholder {
  color: var(--uikit-text-secondary, #6b7280);
}

.resizable-demo__info {
  margin-top: 8px;
  font-size: 13px;
  color: var(--uikit-text-secondary, #6b7280);
}
</style>
