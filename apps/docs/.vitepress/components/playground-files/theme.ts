/**
 * 主题定制页在线演练场初始模板（VuePlayground files）
 *
 * 模板约束：只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit-im），预览 iframe 才能解析。
 * 用户可自由编辑 theme 配置对象与组件组合，右侧预览实时生效。
 */
export const themePlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { EmUIKitProvider, EmButton, EmAvatar, EmBadge, EmCell } from '@easemob/uikit-im'
</script>

<template>
  <EmUIKitProvider
    :auto-init="false"
    :theme="{
      mode: 'light',
      primaryColor: 203,
      gap: 8,
      shape: 'ground',
      fontSize: 'normal',
      density: 'normal',
    }"
  >
    <div class="theme-stage">
      <div class="theme-row">
        <em-button type="primary">主要按钮</em-button>
        <em-button type="success">成功</em-button>
        <em-button type="danger">危险</em-button>
        <em-button>默认</em-button>
      </div>
      <div class="theme-row">
        <em-avatar name="张三" />
        <em-avatar name="李四" />
        <em-badge :count="8" color="#3b82f6">
          <em-avatar name="A" />
        </em-badge>
      </div>
      <div class="theme-cells">
        <em-cell title="禁言列表" meta="3" show-arrow border />
        <em-cell title="黑名单" meta="12" show-arrow border />
        <em-cell title="共享文件" show-arrow />
      </div>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.theme-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--uikit-bg-base);
  border-radius: 8px;
}
.theme-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.theme-cells {
  width: 320px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
`.trim(),
}
