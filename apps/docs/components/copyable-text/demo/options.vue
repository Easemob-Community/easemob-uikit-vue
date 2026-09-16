<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'
</script>

<template>
  <!-- auto-init=false：文档站未连接 SDK，仅借助 Provider 渲染 Toast 容器 -->
  <EmUIKitProvider :auto-init="false">
    <div
      style="
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
        justify-content: center;
      "
    >
      <em-copyable-text label="默认:" text="图标尺寸 16（默认）" />
      <em-copyable-text label="icon-size:" text="图标尺寸 22" :icon-size="22" />
      <em-copyable-text label="无图标:" text="show-icon 设为 false" :show-icon="false" />
    </div>
  </EmUIKitProvider>
</template>
