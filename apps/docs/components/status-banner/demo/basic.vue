<script setup lang="ts">
import { ref } from 'vue'

const showInfo = ref(true)
const showWarning = ref(true)
const showError = ref(true)
const showSuccess = ref(true)
const showLoading = ref(true)
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <em-status-banner
      v-model:show="showInfo"
      type="info"
      title="正在同步会话"
      description="消息记录同步中，请稍候"
    />
    <em-status-banner
      v-model:show="showWarning"
      type="warning"
      title="网络连接不稳定"
      description="消息可能无法及时送达"
      closable
    />
    <em-status-banner
      v-model:show="showError"
      type="error"
      title="连接已断开"
      description="点击下方按钮重新连接"
      closable
    />
    <em-status-banner
      v-model:show="showSuccess"
      type="success"
      title="已重新连接"
      description="消息收发已恢复正常"
    />
    <em-status-banner
      v-model:show="showLoading"
      type="info"
      loading
      title="正在上传文件"
      description="请勿关闭页面"
    />
  </div>
</template>
