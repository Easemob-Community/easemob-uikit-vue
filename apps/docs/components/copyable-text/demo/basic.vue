<script setup lang="ts">
import { EmUIKitProvider } from '@easemob-community/uikit-im'
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
      <em-copyable-text label="用户 ID:" text="easemob-demo-user-001" />
      <em-copyable-text label="群 ID:" text="group-demo-88372145" />
      <em-copyable-text text="不设置 label 时只展示文本本身" />
      <div style="width: 260px">
        <em-copyable-text
          label="长文本:"
          text="这是一条很长很长的文本内容，容器宽度不足时会自动单行省略，点击复制图标仍可复制完整内容。"
        />
      </div>
    </div>
  </EmUIKitProvider>
</template>
